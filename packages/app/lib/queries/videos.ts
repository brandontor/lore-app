import { createAdminClient, createClient } from '@/lib/supabase/server';
import type { Video, Transcript } from '@lore/shared';

export interface VideoWithCampaign extends Video {
  campaign_name: string;
}

export interface VideoWithSession extends Video {
  transcript_id: string | null;
  transcript_title: string | null;
  session_number: number | null;
  session_date: string | null;
  scene_start_timestamp: string | null;
}

export interface VideoSession {
  transcript_id: string;
  transcript_title: string;
  session_number: number | null;
  session_date: string | null;
  videos: VideoWithSession[];
}

/** Shape returned by Supabase join through transcript_scenes → transcripts */
type RawVideoWithJoin = Video & {
  transcript_scenes: {
    transcript_id: string;
    start_timestamp: string | null;
    transcripts: {
      id: string;
      title: string;
      session_number: number | null;
      session_date: string | null;
    } | null;
  } | null;
};

function flattenVideoSession(raw: RawVideoWithJoin): VideoWithSession {
  const scene = Array.isArray(raw.transcript_scenes)
    ? raw.transcript_scenes[0]
    : raw.transcript_scenes;
  return {
    ...raw,
    transcript_id: scene?.transcript_id ?? null,
    transcript_title: scene?.transcripts?.title ?? null,
    session_number: scene?.transcripts?.session_number ?? null,
    session_date: scene?.transcripts?.session_date ?? null,
    scene_start_timestamp: scene?.start_timestamp ?? null,
  };
}

export function groupVideosBySession(videos: VideoWithSession[]): {
  sessions: VideoSession[];
  ungrouped: VideoWithSession[];
} {
  const sessionMap = new Map<string, VideoSession>();
  const ungrouped: VideoWithSession[] = [];

  for (const video of videos) {
    if (!video.transcript_id) {
      ungrouped.push(video);
      continue;
    }
    if (!sessionMap.has(video.transcript_id)) {
      sessionMap.set(video.transcript_id, {
        transcript_id: video.transcript_id,
        transcript_title: video.transcript_title ?? 'Untitled Session',
        session_number: video.session_number,
        session_date: video.session_date,
        videos: [],
      });
    }
    sessionMap.get(video.transcript_id)!.videos.push(video);
  }

  // Order clips within each session by scene position, falling back to creation time
  for (const session of sessionMap.values()) {
    session.videos.sort((a, b) => {
      if (a.scene_start_timestamp && b.scene_start_timestamp) {
        return a.scene_start_timestamp.localeCompare(b.scene_start_timestamp);
      }
      return a.created_at.localeCompare(b.created_at);
    });
  }

  // Sort sessions newest first (by session_date, then session_number, then first clip date)
  const sessions = Array.from(sessionMap.values()).sort((a, b) => {
    if (a.session_date && b.session_date) {
      return b.session_date.localeCompare(a.session_date);
    }
    if (a.session_number !== null && b.session_number !== null) {
      return b.session_number - a.session_number;
    }
    const aDate = a.videos[0]?.created_at ?? '';
    const bDate = b.videos[0]?.created_at ?? '';
    return bDate.localeCompare(aDate);
  });

  return { sessions, ungrouped };
}

const SESSION_JOIN_SELECT = `
  *,
  transcript_scenes!scene_id (
    transcript_id,
    start_timestamp,
    transcripts!transcript_id ( id, title, session_number, session_date )
  )
` as const;

export async function getVideosByCampaign(campaignId: string): Promise<Video[]> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('videos')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as Video[];
}

export async function getAllUserVideos(): Promise<Video[]> {
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
    .from('videos')
    .select('*')
    .in('campaign_id', campaignIds)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as Video[];
}

export async function getVideosByCampaignWithSession(campaignId: string): Promise<VideoWithSession[]> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('videos')
    .select(SESSION_JOIN_SELECT)
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return (data as RawVideoWithJoin[]).map(flattenVideoSession);
}

export async function getAllUserVideosWithSession(): Promise<VideoWithSession[]> {
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
    .from('videos')
    .select(SESSION_JOIN_SELECT)
    .in('campaign_id', campaignIds)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return (data as RawVideoWithJoin[]).map(flattenVideoSession);
}

export async function getVideoById(id: string): Promise<Video | null> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('videos')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as Video;
}

export interface ReelData {
  transcript: {
    id: string;
    title: string;
    session_number: number | null;
    session_date: string | null;
  };
  videos: VideoWithSession[];
}

export async function getReelByTranscript(transcriptId: string): Promise<ReelData | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // User-scoped client applies RLS — returns null if user can't access this transcript
  const { data: transcript } = await supabase
    .from('transcripts')
    .select('id, title, session_number, session_date, campaign_id')
    .eq('id', transcriptId)
    .single();

  if (!transcript) return null;

  const adminClient = createAdminClient();

  // Scene IDs in scene position order (nulls last)
  const { data: scenes } = await adminClient
    .from('transcript_scenes')
    .select('id')
    .eq('transcript_id', transcriptId)
    .order('start_timestamp', { ascending: true, nullsFirst: false });

  const sceneIds = (scenes ?? []).map((s) => s.id);
  if (sceneIds.length === 0) return { transcript, videos: [] };

  const { data: videos } = await adminClient
    .from('videos')
    .select(SESSION_JOIN_SELECT)
    .in('scene_id', sceneIds)
    .eq('status', 'completed')
    .eq('campaign_id', transcript.campaign_id);

  if (!videos || videos.length === 0) return { transcript, videos: [] };

  // Sort by scene position in transcript
  const sceneOrder = new Map(sceneIds.map((id, i) => [id, i]));
  const sorted = (videos as RawVideoWithJoin[])
    .map(flattenVideoSession)
    .sort((a, b) => (sceneOrder.get(a.scene_id ?? '') ?? 999) - (sceneOrder.get(b.scene_id ?? '') ?? 999));

  return { transcript, videos: sorted };
}

export async function getVideoByShareToken(token: string): Promise<VideoWithCampaign | null> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('videos')
    .select('*, campaigns!campaign_id(name)')
    .eq('share_token', token)
    .eq('is_shared', true)
    .single();

  if (error || !data) return null;

  const raw = data as Video & { campaigns: { name: string } | null };
  return {
    ...raw,
    campaign_name: raw.campaigns?.name ?? '',
  };
}

export async function getVideoSourceTranscript(videoId: string): Promise<Transcript | null> {
  const adminClient = createAdminClient();

  // Collapse videos → transcript_scenes into one join, then fetch transcript
  const { data: link } = await adminClient
    .from('videos')
    .select('transcript_scenes!scene_id(transcript_id)')
    .eq('id', videoId)
    .single();

  const raw = link?.transcript_scenes;
  const sceneLink = Array.isArray(raw) ? raw[0] : raw;
  const transcriptId = (sceneLink as { transcript_id: string } | undefined)?.transcript_id;
  if (!transcriptId) return null;

  const { data: transcript } = await adminClient
    .from('transcripts')
    .select('*')
    .eq('id', transcriptId)
    .single();

  if (!transcript) return null;
  return transcript as Transcript;
}
