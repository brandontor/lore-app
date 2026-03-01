import { createAdminClient } from '@/lib/supabase/server';
import { isFalVideoUrl, CLIP_DURATION } from '@/lib/fal';

/**
 * Downloads a completed fal.ai video, uploads it to Supabase storage,
 * and updates the video row in the DB.
 *
 * Safe to call concurrently — the DB update uses `.neq('status', 'completed')`
 * so duplicate calls are idempotent.
 *
 * @returns The storage path if upload succeeded, null if upload failed (video
 *   is still marked `completed` so polling stops).
 */
export async function processCompletedFalVideo(
  videoId: string,
  campaignId: string,
  falVideoUrl: string
): Promise<{ storagePath: string | null }> {
  const adminClient = createAdminClient();
  let storagePath: string | null = null;

  try {
    // Validate the URL comes from an expected fal.ai hostname before fetching
    if (!isFalVideoUrl(falVideoUrl)) {
      throw new Error(`Unexpected video URL hostname: ${new URL(falVideoUrl).hostname}`);
    }

    const videoRes = await fetch(falVideoUrl);

    // Verify the response is actually a video before storing it
    const contentType = videoRes.headers.get('content-type') ?? '';
    if (!videoRes.ok || !contentType.startsWith('video/')) {
      throw new Error(`Unexpected content-type from fal.ai: ${contentType}`);
    }

    const buffer = await videoRes.arrayBuffer();
    // Namespace by campaign so RLS policies can scope by first path segment
    const fileName = `${campaignId}/${videoId}.mp4`;

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
    .eq('id', videoId)
    .neq('status', 'completed');

  return { storagePath };
}
