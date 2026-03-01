'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { buildVideoPrompt, submitToFal } from '@/lib/fal';
import type { ActionResult, VideoStyle } from '@lore/shared';
import { MAX_SCENES } from '@/lib/video-constants';

export async function generateVideo(
  campaignId: string,
  sceneIds: string[],
  style: VideoStyle,
  title: string
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

  const adminClient = createAdminClient();

  const { data: hasWrite } = await supabase.rpc('user_has_campaign_write', {
    p_campaign_id: campaignId,
  });
  if (!hasWrite) return { error: 'Access denied' };

  const [
    { data: scenes },
    { data: campaign },
    { data: characters },
  ] = await Promise.all([
    adminClient
      .from('transcript_scenes')
      .select('id, transcript_id, title, description, mood')
      .in('id', sceneIds)
      .eq('campaign_id', campaignId),
    adminClient
      .from('campaigns')
      .select('name')
      .eq('id', campaignId)
      .single(),
    adminClient
      .from('characters')
      .select('id, name, appearance, race, class')
      .eq('campaign_id', campaignId),
  ]);

  if (!campaign) return { error: 'Campaign not found' };
  if (!scenes || scenes.length === 0) return { error: 'No scenes found' };

  const characterList = characters ?? [];

  const results = await Promise.allSettled(
    // Note: scenes.length is capped at MAX_SCENES above, so concurrency is bounded
    scenes.map(async (scene) => {
      const prompt = await buildVideoPrompt(
        scene as Parameters<typeof buildVideoPrompt>[0],
        style,
        campaign.name,
        characterList
      );

      const webhookSecret = process.env.WEBHOOK_SECRET;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      const webhookUrl =
        webhookSecret && appUrl
          ? `${appUrl}/api/videos/webhook?secret=${webhookSecret}`
          : undefined;

      const { requestId } = await submitToFal(prompt, webhookUrl);

      const sceneTitle = scene.title || 'Untitled Scene';
      const videoTitle = `${trimmedTitle} — ${sceneTitle}`;

      const { data: video, error: insertError } = await adminClient
        .from('videos')
        .insert({
          campaign_id: campaignId,
          title: videoTitle,
          style,
          status: 'pending',
          fal_request_id: requestId,
          scene_id: scene.id,
          requested_by: user.id,
        })
        .select('id')
        .single();

      if (insertError || !video) throw new Error(insertError?.message ?? 'Failed to insert video');

      await adminClient
        .from('video_transcripts')
        .insert({
          video_id: video.id,
          transcript_id: scene.transcript_id,
        });
    })
  );

  const successCount = results.filter((r) => r.status === 'fulfilled').length;

  if (successCount === 0) {
    const reason = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')?.reason;

    // Log the real error so it appears in Vercel runtime logs
    console.error('[generateVideo] all scenes failed. First rejection:', reason);

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
