'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { ActionResult, TranscriptStatus } from '@lore/shared';

export async function createTranscript(
  campaignId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const title = (formData.get('title') as string)?.trim();
  if (!title) return { error: 'Title is required' };

  const content = (formData.get('content') as string)?.trim();
  if (!content) return { error: 'Content is required' };

  const adminClient = createAdminClient();

  // Verify user has write access to this campaign
  const [{ data: owned }, { data: member }] = await Promise.all([
    adminClient.from('campaigns').select('id').eq('id', campaignId).eq('owner_id', user.id).single(),
    adminClient.from('campaign_members').select('permission').eq('campaign_id', campaignId).eq('user_id', user.id).single(),
  ]);

  const hasWrite = !!owned || member?.permission === 'write';
  if (!hasWrite) return { error: 'Access denied' };

  const sessionNumberRaw = formData.get('session_number') as string;
  const durationRaw = formData.get('duration_minutes') as string;

  const { error } = await adminClient
    .from('transcripts')
    .insert({
      campaign_id: campaignId,
      title,
      content,
      source: 'manual',
      status: 'processed',
      uploaded_by: user.id,
      session_number: sessionNumberRaw ? parseInt(sessionNumberRaw, 10) : null,
      session_date: (formData.get('session_date') as string) || null,
      duration_minutes: durationRaw ? parseInt(durationRaw, 10) : null,
    });

  if (error) return { error: error.message };

  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}`);
}

export async function updateTranscript(
  transcriptId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const title = (formData.get('title') as string)?.trim();
  if (!title) return { error: 'Title is required' };

  const adminClient = createAdminClient();

  // Fetch transcript to get campaign_id
  const { data: transcript } = await adminClient
    .from('transcripts')
    .select('campaign_id')
    .eq('id', transcriptId)
    .single();

  if (!transcript) return { error: 'Transcript not found' };

  // Verify write access
  const [{ data: owned }, { data: member }] = await Promise.all([
    adminClient.from('campaigns').select('id').eq('id', transcript.campaign_id).eq('owner_id', user.id).single(),
    adminClient.from('campaign_members').select('permission').eq('campaign_id', transcript.campaign_id).eq('user_id', user.id).single(),
  ]);

  const hasWrite = !!owned || member?.permission === 'write';
  if (!hasWrite) return { error: 'Access denied' };

  const sessionNumberRaw = formData.get('session_number') as string;
  const durationRaw = formData.get('duration_minutes') as string;

  const { error } = await adminClient
    .from('transcripts')
    .update({
      title,
      content: (formData.get('content') as string)?.trim() || '',
      session_number: sessionNumberRaw ? parseInt(sessionNumberRaw, 10) : null,
      session_date: (formData.get('session_date') as string) || null,
      duration_minutes: durationRaw ? parseInt(durationRaw, 10) : null,
      status: formData.get('status') as TranscriptStatus,
    })
    .eq('id', transcriptId);

  if (error) return { error: error.message };

  revalidatePath(`/transcripts/${transcriptId}`);
  redirect(`/transcripts/${transcriptId}`);
}

export async function deleteTranscript(transcriptId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const adminClient = createAdminClient();

  // Fetch transcript to get campaign_id
  const { data: transcript } = await adminClient
    .from('transcripts')
    .select('campaign_id')
    .eq('id', transcriptId)
    .single();

  if (!transcript) return { error: 'Transcript not found' };

  // Verify write access
  const [{ data: owned }, { data: member }] = await Promise.all([
    adminClient.from('campaigns').select('id').eq('id', transcript.campaign_id).eq('owner_id', user.id).single(),
    adminClient.from('campaign_members').select('permission').eq('campaign_id', transcript.campaign_id).eq('user_id', user.id).single(),
  ]);

  const hasWrite = !!owned || member?.permission === 'write';
  if (!hasWrite) return { error: 'Access denied' };

  const { error } = await adminClient
    .from('transcripts')
    .delete()
    .eq('id', transcriptId);

  if (error) return { error: error.message };

  revalidatePath('/transcripts');
  revalidatePath(`/campaigns/${transcript.campaign_id}`);
  redirect('/transcripts');
}

export async function upsertSpeakerMapping(
  campaignId: string,
  speakerName: string,
  characterId: string | null
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const adminClient = createAdminClient();

  // Verify write access
  const [{ data: owned }, { data: member }] = await Promise.all([
    adminClient.from('campaigns').select('id').eq('id', campaignId).eq('owner_id', user.id).single(),
    adminClient.from('campaign_members').select('permission').eq('campaign_id', campaignId).eq('user_id', user.id).single(),
  ]);

  const hasWrite = !!owned || member?.permission === 'write';
  if (!hasWrite) return { error: 'Access denied' };

  const { error } = await adminClient
    .from('campaign_speaker_mappings')
    .upsert(
      { campaign_id: campaignId, speaker_name: speakerName, character_id: characterId, updated_at: new Date().toISOString() },
      { onConflict: 'campaign_id,speaker_name' }
    );

  if (error) return { error: error.message };

  return {};
}
