'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { buildVideoPrompt, submitToFal } from '@/lib/fal';
import type { ActionResult, VideoStyle } from '@lore/shared';

export async function generateVideo(
  campaignId: string,
  transcriptIds: string[],
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
  let successCount = 0;

  const results = await Promise.allSettled(
    scenes.map(async (scene) => {
      const prompt = await buildVideoPrompt(
        scene as Parameters<typeof buildVideoPrompt>[0],
        style,
        campaign.name,
        characterList
      );

      const { requestId } = await submitToFal(prompt);

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

  successCount = results.filter((r) => r.status === 'fulfilled').length;

  if (successCount === 0) {
    const firstError = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    return { error: firstError?.reason?.message ?? 'Failed to generate any videos' };
  }

  revalidatePath('/videos');
  redirect('/videos');
}
