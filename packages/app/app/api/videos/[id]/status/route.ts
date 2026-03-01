import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getFalStatus } from '@/lib/fal';
import { processCompletedFalVideo } from '@/lib/video-processing';

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
    .select('id, status, fal_request_id, storage_path, campaign_id, fal_model')
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
    falStatus = await getFalStatus(
      video.fal_request_id,
      // Fall back to the legacy text-to-video model for rows created before
      // migration 010 added the fal_model column (those rows have NULL).
      video.fal_model ?? 'fal-ai/kling-video/v1.6/standard/text-to-video'
    );
  } catch {
    return NextResponse.json({ status: video.status, storage_path: video.storage_path });
  }

  if (falStatus.status === 'COMPLETED' && falStatus.videoUrl) {
    const { storagePath } = await processCompletedFalVideo(id, video.campaign_id, falStatus.videoUrl);
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
