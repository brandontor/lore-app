import { createAdminClient } from '@/lib/supabase/server';
import { isFalVideoUrl, CLIP_DURATION } from '@/lib/fal';

/**
 * Downloads a keyframe image from a fal.ai temporary URL and uploads it
 * permanently to Supabase Storage. Returns a public CDN URL.
 *
 * The filename extension is derived from the actual content-type returned by
 * fal.ai, so JPEG/PNG/WebP bytes are always stored with a matching extension.
 * (FLUX is configured to output JPEG via `output_format: 'jpeg'`, so in practice
 * this will almost always be `.jpg`.)
 */
export async function uploadKeyframe(
  falImageUrl: string,
  campaignId: string,
  videoId: string
): Promise<{ storageUrl: string }> {
  if (!isFalVideoUrl(falImageUrl)) {
    throw new Error(`Unexpected image URL hostname: ${new URL(falImageUrl).hostname}`);
  }

  const imageRes = await fetch(falImageUrl);
  const contentType = imageRes.headers.get('content-type') ?? '';
  if (!imageRes.ok || !contentType.startsWith('image/')) {
    throw new Error(`Unexpected content-type from fal.ai: ${contentType}`);
  }

  const buffer = await imageRes.arrayBuffer();

  // Derive the file extension from the actual MIME type to avoid a
  // JPEG-extension-on-PNG-bytes mismatch.
  const ext =
    contentType.includes('png') ? 'png'
    : contentType.includes('webp') ? 'webp'
    : 'jpg';

  const fileName = `${campaignId}/${videoId}_keyframe.${ext}`;

  const adminClient = createAdminClient();
  const { error: uploadError } = await adminClient.storage
    .from('campaign-videos')
    .upload(fileName, buffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Keyframe upload failed: ${uploadError.message}`);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL not configured');

  return {
    storageUrl: `${supabaseUrl}/storage/v1/object/public/campaign-videos/${fileName}`,
  };
}

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
  } catch (err) {
    // Upload failure is non-fatal: mark completed with null storage_path so polling stops
    console.error('[processCompletedFalVideo] upload failed for video', videoId, err);
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
