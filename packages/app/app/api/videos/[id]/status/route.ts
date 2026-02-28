import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getFalStatus } from '@/lib/fal';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = createAdminClient();

  const { data: video, error } = await adminClient
    .from('videos')
    .select('id, status, fal_request_id, storage_path, campaign_id')
    .eq('id', id)
    .single();

  if (error || !video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  // Only users with access to the campaign can poll
  const { data: hasAccess } = await supabase.rpc('user_has_campaign_access', {
    p_campaign_id: video.campaign_id,
  });
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Already settled — return immediately
  if (video.status === 'completed' || video.status === 'error') {
    return NextResponse.json({ status: video.status, storage_path: video.storage_path });
  }

  if (!video.fal_request_id) {
    return NextResponse.json({ status: video.status, storage_path: video.storage_path });
  }

  let falStatus: Awaited<ReturnType<typeof getFalStatus>>;
  try {
    falStatus = await getFalStatus(video.fal_request_id);
  } catch {
    return NextResponse.json({ status: video.status, storage_path: video.storage_path });
  }

  if (falStatus.status === 'COMPLETED' && falStatus.videoUrl) {
    // Fetch from fal.ai and upload to Supabase storage
    let storagePath: string | null = null;
    try {
      const videoRes = await fetch(falStatus.videoUrl);
      if (videoRes.ok) {
        const buffer = await videoRes.arrayBuffer();
        const fileName = `${id}.mp4`;

        const { error: uploadError } = await adminClient.storage
          .from('campaign-videos')
          .upload(fileName, buffer, {
            contentType: 'video/mp4',
            upsert: true,
          });

        if (!uploadError) {
          storagePath = fileName;
        }
      }
    } catch {
      // If upload fails, still mark completed so polling stops; storage_path stays null
    }

    await adminClient
      .from('videos')
      .update({
        status: 'completed',
        storage_path: storagePath,
        duration_seconds: 5,
      })
      .eq('id', id);

    return NextResponse.json({ status: 'completed', storage_path: storagePath });
  }

  if (falStatus.status === 'FAILED') {
    await adminClient
      .from('videos')
      .update({ status: 'error' })
      .eq('id', id);

    return NextResponse.json({ status: 'error', storage_path: null });
  }

  // Still in queue or processing — update status in DB
  const dbStatus = falStatus.status === 'IN_PROGRESS' ? 'processing' : 'pending';
  if (dbStatus !== video.status) {
    await adminClient
      .from('videos')
      .update({ status: dbStatus })
      .eq('id', id);
  }

  return NextResponse.json({ status: dbStatus, storage_path: null });
}
