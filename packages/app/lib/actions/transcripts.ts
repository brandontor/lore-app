'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { ActionResult, TranscriptStatus } from '@lore/shared';

const VALID_STATUSES: TranscriptStatus[] = ['pending', 'processing', 'processed', 'error'];

function parseIntField(raw: string | null): number | null | { error: string } {
  if (!raw) return null;
  const n = parseInt(raw, 10);
  if (isNaN(n)) return { error: `"${raw}" is not a valid number` };
  return n;
}

async function verifyWriteAccess(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  campaignId: string
): Promise<boolean> {
  const [{ data: owned }, { data: member }] = await Promise.all([
    adminClient.from('campaigns').select('id').eq('id', campaignId).eq('owner_id', userId).single(),
    adminClient.from('campaign_members').select('permission').eq('campaign_id', campaignId).eq('user_id', userId).single(),
  ]);
  return !!owned || member?.permission === 'write';
}

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

  const hasWrite = await verifyWriteAccess(adminClient, user.id, campaignId);
  if (!hasWrite) return { error: 'Access denied' };

  const sessionNumber = parseIntField(formData.get('session_number') as string);
  if (typeof sessionNumber === 'object' && sessionNumber !== null) return { error: `Session number: ${sessionNumber.error}` };

  const duration = parseIntField(formData.get('duration_minutes') as string);
  if (typeof duration === 'object' && duration !== null) return { error: `Duration: ${duration.error}` };

  const { error } = await adminClient
    .from('transcripts')
    .insert({
      campaign_id: campaignId,
      title,
      content,
      source: 'manual',
      status: 'processed',
      uploaded_by: user.id,
      session_number: sessionNumber,
      session_date: (formData.get('session_date') as string) || null,
      duration_minutes: duration,
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

  const { data: transcript } = await adminClient
    .from('transcripts')
    .select('campaign_id')
    .eq('id', transcriptId)
    .single();

  if (!transcript) return { error: 'Transcript not found' };

  const hasWrite = await verifyWriteAccess(adminClient, user.id, transcript.campaign_id);
  if (!hasWrite) return { error: 'Access denied' };

  const sessionNumber = parseIntField(formData.get('session_number') as string);
  if (typeof sessionNumber === 'object' && sessionNumber !== null) return { error: `Session number: ${sessionNumber.error}` };

  const duration = parseIntField(formData.get('duration_minutes') as string);
  if (typeof duration === 'object' && duration !== null) return { error: `Duration: ${duration.error}` };

  const statusRaw = (formData.get('status') as string) || '';
  const status: TranscriptStatus | undefined = VALID_STATUSES.includes(statusRaw as TranscriptStatus)
    ? (statusRaw as TranscriptStatus)
    : undefined;

  const { error } = await adminClient
    .from('transcripts')
    .update({
      title,
      content: (formData.get('content') as string)?.trim() || '',
      session_number: sessionNumber,
      session_date: (formData.get('session_date') as string) || null,
      duration_minutes: duration,
      ...(status !== undefined ? { status } : {}),
    })
    .eq('id', transcriptId);

  if (error) return { error: error.message };

  revalidatePath(`/transcripts/${transcriptId}`);
  revalidatePath(`/campaigns/${transcript.campaign_id}`);
  redirect(`/transcripts/${transcriptId}`);
}

export async function deleteTranscript(transcriptId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const adminClient = createAdminClient();

  const { data: transcript } = await adminClient
    .from('transcripts')
    .select('campaign_id')
    .eq('id', transcriptId)
    .single();

  if (!transcript) return { error: 'Transcript not found' };

  const hasWrite = await verifyWriteAccess(adminClient, user.id, transcript.campaign_id);
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

  const trimmedName = speakerName.trim();
  if (!trimmedName) return { error: 'Speaker name is required' };
  if (trimmedName.length > 100) return { error: 'Speaker name is too long' };

  const adminClient = createAdminClient();

  const hasWrite = await verifyWriteAccess(adminClient, user.id, campaignId);
  if (!hasWrite) return { error: 'Access denied' };

  const { error } = await adminClient
    .from('campaign_speaker_mappings')
    .upsert(
      { campaign_id: campaignId, speaker_name: trimmedName, character_id: characterId },
      { onConflict: 'campaign_id,speaker_name' }
    );

  if (error) return { error: error.message };

  return {};
}
