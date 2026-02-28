import { describe, it, expect, vi, beforeEach } from 'vitest';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { generateVideo, MAX_SCENES } from '@/lib/actions/videos';
import { OWNER_ID, CAMPAIGN_ID, SCENE_ID } from '../../helpers/builders';

// ---- Supabase mock ----
const mockGetUser = vi.fn();
const mockRpc     = vi.fn();
const mockFrom    = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient:      vi.fn(() => ({ auth: { getUser: mockGetUser }, rpc: mockRpc })),
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

// ---- fal mock ----
const mockBuildVideoPrompt = vi.fn();
const mockSubmitToFal      = vi.fn();

vi.mock('@/lib/fal', () => ({
  buildVideoPrompt: (...args: unknown[]) => mockBuildVideoPrompt(...args),
  submitToFal:      (...args: unknown[]) => mockSubmitToFal(...args),
}));

vi.mock('next/cache',      () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

// Chain builder matching existing test pattern
function makeChain(data: unknown, error: unknown = null) {
  const chain: Record<string, unknown> = {};
  ['select', 'insert', 'update', 'delete', 'eq', 'in', 'neq', 'is', 'order'].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.single = vi.fn().mockResolvedValue({ data, error });
  (chain as unknown as Promise<unknown>).then = (
    resolve: (v: { data: unknown; error: unknown }) => unknown
  ) => Promise.resolve({ data, error }).then(resolve);
  return chain;
}

const VIDEO_ID   = '00000000-0000-0000-0005-000000000001';
const SCENE_ID_2 = '00000000-0000-0000-0004-000000000002';

const mockScene = {
  id: SCENE_ID,
  transcript_id: '00000000-0000-0000-0003-000000000001',
  title: 'Dragon Awakens',
  description: 'A dragon rises.',
  mood: 'dramatic',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockBuildVideoPrompt.mockResolvedValue('cinematic epic fantasy film, a dragon rises from its lair');
  mockSubmitToFal.mockResolvedValue({ requestId: 'fal-req-123' });
});

// Helper: mock a successful write-access RPC
function mockWriteAccess(hasAccess: boolean) {
  mockRpc.mockResolvedValue({ data: hasAccess, error: null });
}

// Helper: mock the three parallel admin fetches after access check
function mockDataFetches({
  scenes = [mockScene],
  campaign = { name: 'Test Campaign' },
  characters = [],
}: {
  scenes?: unknown[] | null;
  campaign?: unknown | null;
  characters?: unknown[];
}) {
  mockFrom
    .mockReturnValueOnce(makeChain(scenes))       // transcript_scenes
    .mockReturnValueOnce(makeChain(campaign))      // campaigns
    .mockReturnValueOnce(makeChain(characters));   // characters
}

// Helper: mock the insert + video_transcripts insert
function mockVideoInsert(id = VIDEO_ID) {
  mockFrom
    .mockReturnValueOnce(makeChain({ id }))  // videos insert
    .mockReturnValueOnce(makeChain(null));   // video_transcripts insert
}

// ---------------------------------------------------------------------------
describe('generateVideo', () => {
  it('returns error when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await generateVideo(CAMPAIGN_ID, [SCENE_ID], 'cinematic', 'My Video');
    expect(result).toEqual({ error: 'Not authenticated' });
  });

  it('returns error when title is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    const result = await generateVideo(CAMPAIGN_ID, [SCENE_ID], 'cinematic', '   ');
    expect(result).toEqual({ error: 'Title is required' });
  });

  it('returns error when no scenes selected', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    const result = await generateVideo(CAMPAIGN_ID, [], 'cinematic', 'My Video');
    expect(result).toEqual({ error: 'At least one scene must be selected' });
  });

  it(`returns error when more than MAX_SCENES (${MAX_SCENES}) scenes selected`, async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    const tooMany = Array.from({ length: MAX_SCENES + 1 }, (_, i) => `scene-${i}`);
    const result = await generateVideo(CAMPAIGN_ID, tooMany, 'cinematic', 'My Video');
    expect(result).toEqual({ error: expect.stringContaining('Too many scenes') });
  });

  it('returns error when user lacks write access', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(false);
    const result = await generateVideo(CAMPAIGN_ID, [SCENE_ID], 'cinematic', 'My Video');
    expect(result).toEqual({ error: 'Access denied' });
    // Should not have made any admin data fetches
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns error when no scenes found in DB for the campaign', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    mockDataFetches({ scenes: [] });
    const result = await generateVideo(CAMPAIGN_ID, [SCENE_ID], 'cinematic', 'My Video');
    expect(result).toEqual({ error: 'No scenes found' });
  });

  it('returns generic error when all scene generations fail', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    mockDataFetches({});
    mockBuildVideoPrompt.mockRejectedValue(new Error('Network error'));
    const result = await generateVideo(CAMPAIGN_ID, [SCENE_ID], 'cinematic', 'My Video');
    expect(result).toEqual({ error: 'Failed to start video generation. Please try again.' });
  });

  it('returns rate-limit friendly message when 429 error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    mockDataFetches({});
    mockBuildVideoPrompt.mockRejectedValue(new Error('Request failed with status code 429'));
    const result = await generateVideo(CAMPAIGN_ID, [SCENE_ID], 'cinematic', 'My Video');
    expect(result).toEqual({ error: expect.stringContaining('rate limit') });
  });

  it('redirects to /videos when at least one scene succeeds', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    mockDataFetches({ scenes: [mockScene] });
    mockVideoInsert();
    const result = await generateVideo(CAMPAIGN_ID, [SCENE_ID], 'cinematic', 'My Video');
    expect(redirect).toHaveBeenCalledWith('/videos');
    expect(revalidatePath).toHaveBeenCalledWith('/videos');
    expect(result).toBeUndefined(); // redirect throws internally in Next.js (vi.fn here)
  });

  it('calls buildVideoPrompt with correct scene and style', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    mockDataFetches({});
    mockVideoInsert();
    await generateVideo(CAMPAIGN_ID, [SCENE_ID], 'anime', 'Test');
    expect(mockBuildVideoPrompt).toHaveBeenCalledWith(
      expect.objectContaining({ id: SCENE_ID, title: 'Dragon Awakens' }),
      'anime',
      'Test Campaign',
      []
    );
  });

  it('video title includes collection title and scene title', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    mockDataFetches({});
    const insertChain = makeChain({ id: VIDEO_ID });
    mockFrom
      .mockReturnValueOnce(insertChain) // videos insert
      .mockReturnValueOnce(makeChain(null)); // video_transcripts
    await generateVideo(CAMPAIGN_ID, [SCENE_ID], 'cinematic', 'Epic Moments');
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Epic Moments — Dragon Awakens' })
    );
  });

  it('partial success (1 of 2 scenes fails) still redirects', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    // Two scenes
    mockDataFetches({ scenes: [mockScene, { ...mockScene, id: SCENE_ID_2, title: 'Second Scene' }] });
    // First scene: buildVideoPrompt fails
    mockBuildVideoPrompt
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('good prompt');
    // Second scene: succeeds
    mockVideoInsert();
    await generateVideo(CAMPAIGN_ID, [SCENE_ID, SCENE_ID_2], 'cinematic', 'My Video');
    expect(redirect).toHaveBeenCalledWith('/videos');
  });
});
