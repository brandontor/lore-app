'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  buildVideoPrompt,
  generateKeyframe,
  submitImageToVideoFal,
  FAL_VIDEO_MODEL,
  DEFAULT_MOTION_INTENSITY,
  DEFAULT_CLIP_DURATION,
} from '@/lib/fal';
import { uploadKeyframe } from '@/lib/video-processing';
import type { ActionResult, VideoStyle, CameraPreset } from '@lore/shared';
import { MAX_SCENES } from '@/lib/video-constants';

export async function generateVideo(
  campaignId: string,
  sceneIds: string[],
  style: VideoStyle,
  title: string,
  cameraPreset: CameraPreset = 'auto',
  motionIntensity: number = DEFAULT_MOTION_INTENSITY,
  clipDuration: number = DEFAULT_CLIP_DURATION
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const trimmedTitle = title.trim();
  if (!trimmedTitle) return { error: 'Title is required' };
  if (sceneIds.length === 0) return { error: 'At least one scene must be selected' };
  if (sceneIds.length > MAX_SCENES) {
    return { error: `Too many scenes selected (max ${MAX_SCENES}). Please reduce your selection.` };
  }

  // Server-side sanitisation of user-controlled generation params
  const safeIntensity = Math.min(0.8, Math.max(0.3, motionIntensity));
  const safeDuration = clipDuration === 10 ? 10 : 5; // whitelist — only 5s or 10s

  const adminClient = createAdminClient();

  const { data: hasWrite } = await supabase.rpc('user_has_campaign_write', {
    p_campaign_id: campaignId,
  });
  if (!hasWrite) return { error: 'Access denied' };

  // Deduplication: skip scenes that already have a non-failed video for this style
  const { data: existingVideos } = await adminClient
    .from('videos')
    .select('scene_id')
    .in('scene_id', sceneIds)
    .eq('style', style)
    .eq('campaign_id', campaignId)
    .in('status', ['completed', 'pending', 'processing']);

  const existingSceneIds = new Set(existingVideos?.map((v) => v.scene_id) ?? []);
  const newSceneIds = sceneIds.filter((id) => !existingSceneIds.has(id));

  if (newSceneIds.length === 0) {
    revalidatePath('/videos');
    redirect('/videos?notice=already-generated');
  }

  const [
    { data: scenes },
    { data: campaign },
    { data: characters },
    { data: npcs },
  ] = await Promise.all([
    adminClient
      .from('transcript_scenes')
      .select('id, transcript_id, title, description, mood, raw_speaker_lines')
      .in('id', newSceneIds)
      .eq('campaign_id', campaignId),
    adminClient
      .from('campaigns')
      .select('name, setting, system')
      .eq('id', campaignId)
      .single(),
    adminClient
      .from('characters')
      .select('id, name, appearance, race, class')
      .eq('campaign_id', campaignId),
    adminClient
      .from('npcs')
      .select('name, appearance, description')
      .eq('campaign_id', campaignId),
  ]);

  if (!campaign) return { error: 'Campaign not found' };
  if (!scenes || scenes.length === 0) return { error: 'No scenes found' };

  const characterList = characters ?? [];
  const npcList = npcs ?? [];

  const webhookSecret = process.env.WEBHOOK_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const webhookUrl =
    webhookSecret && appUrl
      ? `${appUrl}/api/videos/webhook?secret=${webhookSecret}`
      : undefined;

  const results = await Promise.allSettled(
    // Note: scenes.length is capped at MAX_SCENES above, so concurrency is bounded
    scenes.map(async (scene) => {
      const { imagePrompt, motionPrompt } = await buildVideoPrompt(
        scene as Parameters<typeof buildVideoPrompt>[0],
        style,
        campaign.name,
        campaign.setting ?? null,
        characterList,
        npcList,
        cameraPreset
      );

      const sceneTitle = scene.title || 'Untitled Scene';
      const videoTitle = `${trimmedTitle} — ${sceneTitle}`;

      // Insert the video row FIRST so we always have a DB record before starting
      // any billable fal.ai jobs. If the insert fails, we throw before spending money.
      // If a later step fails, the try/catch below marks the row as 'error'.
      const { data: video, error: insertError } = await adminClient
        .from('videos')
        .insert({
          campaign_id: campaignId,
          title: videoTitle,
          style,
          status: 'pending',
          fal_model: FAL_VIDEO_MODEL,
          scene_id: scene.id,
          requested_by: user.id,
          camera_preset: cameraPreset,
          motion_intensity: safeIntensity,
          clip_duration: safeDuration,
        })
        .select('id')
        .single();

      if (insertError || !video) throw new Error(insertError?.message ?? 'Failed to insert video');

      try {
        // Generate keyframe image via FLUX dev
        const { imageUrl: falImageUrl } = await generateKeyframe(imagePrompt);

        // Upload keyframe permanently and save the CDN URL
        const { storageUrl } = await uploadKeyframe(falImageUrl, campaignId, video.id);
        await adminClient
          .from('videos')
          .update({ image_url: storageUrl })
          .eq('id', video.id);

        // Submit Kling image-to-video job using the permanent Supabase CDN URL.
        // The fal.ai temporary URL (falImageUrl) may expire before Kling starts
        // executing the job; the storage URL never expires.
        // cameraPreset is now encoded into motionPrompt by buildVideoPrompt via GPT.
        const { requestId } = await submitImageToVideoFal(storageUrl, motionPrompt, {
          webhookUrl,
          cfgScale: safeIntensity,
          duration: safeDuration,
        });
        const { error: falReqUpdateError } = await adminClient
          .from('videos')
          .update({ fal_request_id: requestId })
          .eq('id', video.id);
        if (falReqUpdateError) throw new Error(`Failed to record fal_request_id: ${falReqUpdateError.message}`);

        // Link to source transcript
        await adminClient
          .from('video_transcripts')
          .insert({
            video_id: video.id,
            transcript_id: scene.transcript_id,
          });
      } catch (err) {
        // Mark the row as error so it doesn't stay stuck in 'pending' with no fal_request_id
        await adminClient
          .from('videos')
          .update({ status: 'error' })
          .eq('id', video.id);
        throw err;
      }
    })
  );

  const successCount = results.filter((r) => r.status === 'fulfilled').length;

  if (successCount === 0) {
    const reason = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')?.reason;

    // Log the real error so it appears in Vercel runtime logs
    console.error('[generateVideo] all scenes failed. First rejection:', reason);
    if (reason?.body !== undefined) {
      console.error('[generateVideo] fal.ai error body:', JSON.stringify(reason.body));
    }

    // Handle non-Error throws (fal SDK and others can throw plain objects or strings)
    const errMsg: string =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : typeof reason?.message === 'string'
            ? reason.message
            : JSON.stringify(reason ?? '');

    if (errMsg.includes('not configured') || errMsg.includes('API_KEY')) {
      return { error: 'Service configuration error. Please contact support.' };
    }
    if (errMsg.includes('401') || errMsg.includes('403') || errMsg.toLowerCase().includes('unauthorized') || errMsg.toLowerCase().includes('credentials')) {
      return { error: 'Service configuration error. Please contact support.' };
    }
    if (errMsg.includes('429') || errMsg.toLowerCase().includes('rate limit')) {
      return { error: 'AI service rate limit reached — please wait a moment and try again.' };
    }
    return { error: 'Failed to start video generation. Please try again.' };
  }

  revalidatePath('/videos');
  redirect('/videos');
}
