import type {
  Campaign,
  CampaignWithRole,
  CampaignMember,
  Invitation,
  Transcript,
  TranscriptScene,
  Video,
  Profile,
  NPC,
  Location,
} from '@lore/shared';

let _counter = 0;
const uid = () => `00000000-0000-0000-0000-${String(++_counter).padStart(12, '0')}`;

export const OWNER_ID    = '00000000-0000-0000-0001-000000000001';
export const MEMBER_ID   = '00000000-0000-0000-0001-000000000002';
export const STRANGER_ID = '00000000-0000-0000-0001-000000000003';
export const CAMPAIGN_ID = '00000000-0000-0000-0002-000000000001';

export function buildCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: CAMPAIGN_ID,
    name: 'Test Campaign',
    description: null,
    system: 'D&D 5e',
    setting: null,
    status: 'active',
    owner_id: OWNER_ID,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function buildCampaignWithRole(
  overrides: Partial<CampaignWithRole> = {}
): CampaignWithRole {
  return { ...buildCampaign(), userRole: 'owner', ...overrides };
}

export function buildMember(overrides: Partial<CampaignMember> = {}): CampaignMember {
  return {
    id: uid(),
    campaign_id: CAMPAIGN_ID,
    user_id: MEMBER_ID,
    permission: 'read',
    invited_by: OWNER_ID,
    created_at: '2024-01-01T00:00:00Z',
    profile: { id: MEMBER_ID, display_name: 'Test Player', avatar_url: null },
    ...overrides,
  };
}

export function buildInvitation(overrides: Partial<Invitation> = {}): Invitation {
  return {
    id: uid(),
    campaign_id: CAMPAIGN_ID,
    invited_by: OWNER_ID,
    email: 'invitee@lore-test.local',
    permission: 'read',
    token: 'test-token-abc123',
    expires_at: '2099-01-01T00:00:00Z',
    accepted_at: null,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function buildProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: OWNER_ID,
    display_name: 'Test DM',
    avatar_url: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function buildTranscript(overrides: Partial<Transcript> = {}): Transcript {
  return {
    id: uid(),
    campaign_id: CAMPAIGN_ID,
    title: 'Session 1',
    session_number: 1,
    content: 'The party gathered at the tavern...',
    summary: null,
    source: 'manual',
    status: 'pending',
    duration_minutes: null,
    session_date: null,
    uploaded_by: OWNER_ID,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export const TRANSCRIPT_ID = '00000000-0000-0000-0003-000000000001';
export const SCENE_ID      = '00000000-0000-0000-0004-000000000001';

export function buildScene(overrides: Partial<TranscriptScene> = {}): TranscriptScene {
  return {
    id: SCENE_ID,
    transcript_id: TRANSCRIPT_ID,
    campaign_id: CAMPAIGN_ID,
    title: 'The Dragon Awakens',
    description: 'The ancient dragon rises from its lair as the party watches in awe.',
    mood: 'dramatic',
    start_timestamp: '00:30:00',
    end_timestamp: '00:45:00',
    raw_speaker_lines: ['[DM] The ground begins to tremble.', '[Aria] Watch out everyone!', '[Theron] Draw your weapons!'],
    confidence_score: 0.8,
    selected_for_video: true,
    key_visuals: [],
    characters_present: [],
    location_name: null,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export const NPC_ID      = '00000000-0000-0000-0006-000000000001';
export const LOCATION_ID = '00000000-0000-0000-0007-000000000001';

export function buildNpc(overrides: Partial<NPC> = {}): NPC {
  return {
    id: NPC_ID,
    campaign_id: CAMPAIGN_ID,
    name: 'Malachar the Betrayer',
    role: 'Villain',
    description: 'Former court advisor turned necromancer.',
    appearance: 'Gaunt figure in tattered black robes.',
    image_url: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function buildLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: LOCATION_ID,
    campaign_id: CAMPAIGN_ID,
    name: 'The Sunken Citadel',
    type: 'dungeon',
    description: 'An ancient fortress half-submerged in a flooded canyon.',
    image_url: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function buildVideo(overrides: Partial<Video> = {}): Video {
  return {
    id: uid(),
    campaign_id: CAMPAIGN_ID,
    title: 'Epic Encounter',
    style: 'cinematic',
    status: 'pending',
    storage_path: null,
    duration_seconds: null,
    fal_request_id: null,
    fal_model: 'fal-ai/kling-video/v2.1/pro/image-to-video',
    scene_id: null,
    image_url: null,
    camera_preset: 'auto' as const,
    motion_intensity: 0.5,
    clip_duration: 5,
    requested_by: OWNER_ID,
    share_token: null,
    is_shared: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}
