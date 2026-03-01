import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getFalStatus } from '@/lib/fal';
import { processCompletedFalVideo } from '@/lib/video-processing';

// Called by pg_cron every minute via pg_net as a fallback for missed webhooks.
export async function GET(req: Request) {
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = createAdminClient();

  const { data: videos } = await adminClient
    .from('videos')
    .select('id, campaign_id, fal_request_id, status, fal_model')
    .in('status', ['pending', 'processing'])
    .not('fal_request_id', 'is', null)
    .limit(20);

  const results = await Promise.allSettled(
    (videos ?? []).map(async (video) => {
      const falStatus = await getFalStatus(
        video.fal_request_id!,
        video.fal_model ?? 'fal-ai/kling-video/v1.6/standard/text-to-video'
      );

      if (falStatus.status === 'COMPLETED' && falStatus.videoUrl) {
        await processCompletedFalVideo(video.id, video.campaign_id, falStatus.videoUrl);
      } else if (falStatus.status === 'FAILED') {
        await adminClient
          .from('videos')
          .update({ status: 'error' })
          .eq('id', video.id)
          .neq('status', 'error');
      }
    })
  );

  const processed = results.filter((r) => r.status === 'fulfilled').length;

  return NextResponse.json({ processed, total: videos?.length ?? 0 });
}
