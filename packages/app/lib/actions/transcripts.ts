'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { ActionResult, TranscriptStatus } from '@lore/shared';
import OpenAI from 'openai';

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

export async function generateSummary(transcriptId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const adminClient = createAdminClient();

  const { data: transcript } = await adminClient
    .from('transcripts')
    .select('campaign_id, content, title, session_number')
    .eq('id', transcriptId)
    .single();

  if (!transcript) return { error: 'Transcript not found' };
  if (!transcript.content?.trim()) return { error: 'Transcript has no content to summarise' };

  const hasWrite = await verifyWriteAccess(adminClient, user.id, transcript.campaign_id);
  if (!hasWrite) return { error: 'Access denied' };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { error: 'OpenAI API key not configured' };

  const openai = new OpenAI({ apiKey });

  const sessionLabel = transcript.title || (transcript.session_number !== null ? `Session ${transcript.session_number}` : 'this session');

  const prompt = `You are a D&D campaign chronicler. Summarise the following session transcript for "${sessionLabel}".

Format your response as markdown with these sections:
## Summary
A 2-3 sentence overview of what happened.

## Key Events
- Bullet list of the 3-5 most important story beats.

## Character Moments
- Notable actions or decisions by individual characters.

## Cliffhanger / What's Next
One sentence on the situation at the end of the session.

Keep the tone epic and engaging. Use the character names from the transcript.

---
TRANSCRIPT:
${transcript.content.slice(0, 12000)}`;

  let summary: string;
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.7,
    });
    summary = response.choices[0]?.message?.content ?? '';
    if (!summary) return { error: 'OpenAI returned an empty response' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { error: `OpenAI error: ${message}` };
  }

  const { error: updateError } = await adminClient
    .from('transcripts')
    .update({ summary })
    .eq('id', transcriptId);

  if (updateError) return { error: updateError.message };

  revalidatePath(`/transcripts/${transcriptId}`);
  return {};
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
