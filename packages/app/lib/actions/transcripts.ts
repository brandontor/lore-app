'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { ActionResult, TranscriptStatus, SceneMood } from '@lore/shared';
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
    if (!summary.trim()) return { error: 'OpenAI returned an empty response' };
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

const VALID_MOODS: SceneMood[] = ['tense', 'triumphant', 'mysterious', 'dramatic', 'comedic', 'melancholic'];

export async function extractScenes(transcriptId: string, campaignId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const adminClient = createAdminClient();

  const [
    { data: transcript },
    { data: campaign },
    { data: characters },
  ] = await Promise.all([
    adminClient.from('transcripts').select('content, title, session_number').eq('id', transcriptId).single(),
    adminClient.from('campaigns').select('name, setting, system').eq('id', campaignId).single(),
    adminClient.from('characters').select('name, class, race, level').eq('campaign_id', campaignId),
  ]);

  if (!transcript) return { error: 'Transcript not found' };
  if (!transcript.content?.trim()) return { error: 'Transcript has no content to analyse' };
  if (!campaign) return { error: 'Campaign not found' };

  const hasWrite = await verifyWriteAccess(adminClient, user.id, campaignId);
  if (!hasWrite) return { error: 'Access denied' };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { error: 'OpenAI API key not configured' };

  const openai = new OpenAI({ apiKey });

  const characterRoster = (characters ?? [])
    .map((c) => `${c.name} (Lvl ${c.level} ${c.race ?? ''} ${c.class ?? ''}`.trim() + ')')
    .join(', ');

  const systemPrompt = `You are a D&D campaign cinematographer. Analyse session transcripts and identify key scenes suitable for cinematic video generation.

Campaign: "${campaign.name}" (${campaign.system})${campaign.setting ? `\nSetting: ${campaign.setting}` : ''}${characterRoster ? `\nParty: ${characterRoster}` : ''}

Identify 3–8 cinematically distinct scenes from the transcript. Each scene should be a self-contained dramatic moment worth visualising.

Return a JSON object with a single key "scenes" containing an array of scene objects. Each scene must have:
- title: string (short, evocative scene title, max 60 chars)
- description: string (2–3 sentences describing what happens visually, suitable as an image/video generation prompt)
- mood: one of exactly: "tense", "triumphant", "mysterious", "dramatic", "comedic", "melancholic"
- start_timestamp: string | null (timestamp from transcript if available, e.g. "00:12:34", else null)
- end_timestamp: string | null
- raw_speaker_lines: string[] (3–6 actual lines of dialogue from the transcript that define this scene)
- confidence_score: number (0.0–1.0, how cinematically distinct and clear this scene is)`;

  const sessionLabel = transcript.title || (transcript.session_number !== null ? `Session ${transcript.session_number}` : 'this session');
  const userPrompt = `Extract cinematic scenes from the transcript for "${sessionLabel}":\n\n${transcript.content.slice(0, 14000)}`;

  let rawContent: string;
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 2000,
    });
    rawContent = response.choices[0]?.message?.content ?? '';
    if (!rawContent.trim()) return { error: 'OpenAI returned an empty response' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { error: `OpenAI error: ${message}` };
  }

  let parsed: { scenes?: unknown[] };
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    return { error: 'Failed to parse scene data from OpenAI response' };
  }

  if (!Array.isArray(parsed.scenes)) {
    return { error: 'Unexpected response format from OpenAI' };
  }

  const rows = parsed.scenes
    .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
    .map((s) => {
      const mood = VALID_MOODS.includes(s.mood as SceneMood) ? (s.mood as SceneMood) : 'dramatic';
      const confidence = typeof s.confidence_score === 'number'
        ? Math.max(0, Math.min(1, s.confidence_score))
        : 0.5;
      return {
        transcript_id: transcriptId,
        campaign_id: campaignId,
        title: String(s.title ?? '').slice(0, 60) || 'Untitled Scene',
        description: String(s.description ?? ''),
        mood,
        start_timestamp: typeof s.start_timestamp === 'string' ? s.start_timestamp : null,
        end_timestamp: typeof s.end_timestamp === 'string' ? s.end_timestamp : null,
        raw_speaker_lines: Array.isArray(s.raw_speaker_lines)
          ? (s.raw_speaker_lines as unknown[]).filter((l) => typeof l === 'string').slice(0, 10) as string[]
          : [],
        confidence_score: confidence,
        selected_for_video: true,
      };
    });

  if (rows.length === 0) return { error: 'No scenes could be extracted from this transcript' };

  // Replace existing scenes for this transcript
  const { error: deleteError } = await adminClient
    .from('transcript_scenes')
    .delete()
    .eq('transcript_id', transcriptId);

  if (deleteError) return { error: deleteError.message };

  const { error: insertError } = await adminClient
    .from('transcript_scenes')
    .insert(rows);

  if (insertError) return { error: insertError.message };

  revalidatePath(`/transcripts/${transcriptId}`);
  return {};
}

export async function toggleSceneSelection(sceneId: string, selected: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const adminClient = createAdminClient();

  const { data: scene } = await adminClient
    .from('transcript_scenes')
    .select('campaign_id')
    .eq('id', sceneId)
    .single();

  if (!scene) return { error: 'Scene not found' };

  const hasWrite = await verifyWriteAccess(adminClient, user.id, scene.campaign_id);
  if (!hasWrite) return { error: 'Access denied' };

  const { error } = await adminClient
    .from('transcript_scenes')
    .update({ selected_for_video: selected })
    .eq('id', sceneId);

  if (error) return { error: error.message };

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
