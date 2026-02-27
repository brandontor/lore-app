export type Permission = 'read' | 'write';
export type CampaignStatus = 'active' | 'paused' | 'completed' | 'archived';
export type TranscriptStatus = 'pending' | 'processing' | 'processed' | 'error';
export type VideoStatus = 'pending' | 'processing' | 'completed' | 'error';
export type VideoStyle = 'cinematic' | 'anime' | 'painterly' | 'dark-fantasy';
export type TranscriptSource = 'discord' | 'manual' | 'upload';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  system: string;
  setting: string | null;
  status: CampaignStatus;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignWithRole extends Campaign {
  userRole: 'owner' | Permission;
}

export interface CampaignMember {
  id: string;
  campaign_id: string;
  user_id: string;
  permission: Permission;
  invited_by: string;
  created_at: string;
  profile?: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>;
}

export interface Invitation {
  id: string;
  campaign_id: string;
  campaign_name?: string;
  invited_by: string;
  email: string;
  permission: Permission;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface Transcript {
  id: string;
  campaign_id: string;
  title: string;
  session_number: number | null;
  content: string;
  summary: string | null;
  source: TranscriptSource;
  status: TranscriptStatus;
  duration_minutes: number | null;
  session_date: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Character {
  id: string;
  campaign_id: string;
  name: string;
  class: string | null;
  race: string | null;
  level: number;
  appearance: string | null;
  backstory: string | null;
  portrait_url: string | null;
  player_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Video {
  id: string;
  campaign_id: string;
  title: string;
  style: VideoStyle;
  status: VideoStatus;
  storage_path: string | null;
  duration_seconds: number | null;
  requested_by: string;
  created_at: string;
  updated_at: string;
}

export interface SpeakerCharacterMapping {
  id: string;
  campaign_id: string;
  speaker_name: string;
  character_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActionResult<T = undefined> {
  error?: string;
  data?: T;
}
