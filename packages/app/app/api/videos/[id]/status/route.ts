import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getFalStatus, isFalVideoUrl } from '@/lib/fal';
import { CLIP_DURATION } from '@/lib/fal';

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

  // Use 404 for both "not found" and "no access" to avoid leaking video existence
  if (error || !video) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: hasAccess } = await supabase.rpc('user_has_campaign_access', {
    p_campaign_id: video.campaign_id,
  });
  if (!hasAccess) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Already settled — return immediately without hitting fal.ai
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
    let storagePath: string | null = null;
    try {
      // Validate the URL comes from an expected fal.ai hostname before fetching
      if (!isFalVideoUrl(falStatus.videoUrl)) {
        throw new Error(`Unexpected video URL hostname: ${new URL(falStatus.videoUrl).hostname}`);
      }

      const videoRes = await fetch(falStatus.videoUrl);

      // Verify the response is actually a video before storing it
      const contentType = videoRes.headers.get('content-type') ?? '';
      if (!videoRes.ok || !contentType.startsWith('video/')) {
        throw new Error(`Unexpected content-type from fal.ai: ${contentType}`);
      }

      const buffer = await videoRes.arrayBuffer();
      // Namespace by campaign so RLS policies can scope by first path segment
      const fileName = `${video.campaign_id}/${id}.mp4`;

      const { error: uploadError } = await adminClient.storage
        .from('campaign-videos')
        .upload(fileName, buffer, {
          contentType: 'video/mp4',
          upsert: true,
        });

      if (!uploadError) {
        storagePath = fileName;
      }
    } catch {
      // Upload failure is non-fatal: mark completed with null storage_path so polling stops
    }

    // Guard against concurrent polls both trying to update — only update if still not completed
    await adminClient
      .from('videos')
      .update({
        status: 'completed',
        storage_path: storagePath,
        duration_seconds: parseInt(CLIP_DURATION, 10),
      })
      .eq('id', id)
      .neq('status', 'completed');

    return NextResponse.json({ status: 'completed', storage_path: storagePath });
  }

  if (falStatus.status === 'FAILED') {
    await adminClient
      .from('videos')
      .update({ status: 'error' })
      .eq('id', id)
      .neq('status', 'error');

    return NextResponse.json({ status: 'error', storage_path: null });
  }

  // Still in queue or processing — update status in DB only if changed
  const dbStatus = falStatus.status === 'IN_PROGRESS' ? 'processing' : 'pending';
  if (dbStatus !== video.status) {
    await adminClient
      .from('videos')
      .update({ status: dbStatus })
      .eq('id', id);
  }

  return NextResponse.json({ status: dbStatus, storage_path: null });
}
