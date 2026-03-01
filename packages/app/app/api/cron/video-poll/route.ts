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
    .select('id, campaign_id, fal_request_id, status')
    .in('status', ['pending', 'processing'])
    .not('fal_request_id', 'is', null)
    .limit(20);

  let processed = 0;

  for (const video of videos ?? []) {
    let falStatus: Awaited<ReturnType<typeof getFalStatus>>;
    try {
      falStatus = await getFalStatus(video.fal_request_id!);
    } catch {
      continue;
    }

    if (falStatus.status === 'COMPLETED' && falStatus.videoUrl) {
      await processCompletedFalVideo(video.id, video.campaign_id, falStatus.videoUrl);
      processed++;
    } else if (falStatus.status === 'FAILED') {
      await adminClient
        .from('videos')
        .update({ status: 'error' })
        .eq('id', video.id)
        .neq('status', 'error');
      processed++;
    }
  }

  return NextResponse.json({ processed, total: videos?.length ?? 0 });
}
