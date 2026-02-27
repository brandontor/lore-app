import { createAdminClient, createClient } from '@/lib/supabase/server';
import type { Transcript, SpeakerCharacterMapping, TranscriptScene } from '@lore/shared';

export async function getTranscriptsByCampaign(campaignId: string): Promise<Transcript[]> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('transcripts')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('session_number', { ascending: true, nullsFirst: false });

  if (error || !data) return [];
  return data as Transcript[];
}

export async function getAllUserTranscripts(): Promise<Transcript[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const adminClient = createAdminClient();

  const [{ data: owned }, { data: memberships }] = await Promise.all([
    adminClient.from('campaigns').select('id').eq('owner_id', user.id),
    adminClient.from('campaign_members').select('campaign_id').eq('user_id', user.id),
  ]);

  const campaignIds = [
    ...(owned ?? []).map((c) => c.id),
    ...(memberships ?? []).map((m) => m.campaign_id),
  ];
  if (campaignIds.length === 0) return [];

  const { data, error } = await adminClient
    .from('transcripts')
    .select('*')
    .in('campaign_id', campaignIds)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as Transcript[];
}

export async function getTranscriptById(id: string): Promise<Transcript | null> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('transcripts')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as Transcript;
}

export async function getSpeakerMappingsByCampaign(campaignId: string): Promise<SpeakerCharacterMapping[]> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('campaign_speaker_mappings')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('speaker_name', { ascending: true });

  if (error || !data) return [];
  return data as SpeakerCharacterMapping[];
}

export async function getScenesByTranscript(transcriptId: string): Promise<TranscriptScene[]> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('transcript_scenes')
    .select('*')
    .eq('transcript_id', transcriptId)
    .order('start_timestamp', { ascending: true, nullsFirst: true });

  if (error || !data) return [];
  return data as TranscriptScene[];
}

export async function getAllScenesByTranscripts(transcriptIds: string[]): Promise<TranscriptScene[]> {
  if (transcriptIds.length === 0) return [];

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('transcript_scenes')
    .select('*')
    .in('transcript_id', transcriptIds)
    .order('transcript_id', { ascending: true })
    .order('start_timestamp', { ascending: true, nullsFirst: true });

  if (error || !data) return [];
  return data as TranscriptScene[];
}
