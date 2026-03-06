import { describe, it, expect, vi, beforeEach } from 'vitest';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { generateVideo } from '@/lib/actions/videos';
import { MAX_SCENES } from '@/lib/video-constants';
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
const mockBuildVideoPrompt   = vi.fn();
const mockGenerateKeyframe   = vi.fn();
const mockSubmitImageToVideo = vi.fn();

vi.mock('@/lib/fal', () => ({
  buildVideoPrompt:      (...args: unknown[]) => mockBuildVideoPrompt(...args),
  generateKeyframe:      (...args: unknown[]) => mockGenerateKeyframe(...args),
  submitImageToVideoFal: (...args: unknown[]) => mockSubmitImageToVideo(...args),
  FAL_VIDEO_MODEL: 'fal-ai/kling-video/v1.6/standard/image-to-video',
}));

// ---- video-processing mock ----
const mockUploadKeyframe = vi.fn();

vi.mock('@/lib/video-processing', () => ({
  uploadKeyframe: (...args: unknown[]) => mockUploadKeyframe(...args),
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
  // @ts-expect-error — makeChain .then mock is intentionally loosely typed
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
  mockBuildVideoPrompt.mockResolvedValue({
    imagePrompt: 'cinematic epic fantasy film, a dragon rises from its lair',
    motionPrompt: 'camera slowly pans up revealing the dragon',
  });
  mockGenerateKeyframe.mockResolvedValue({ imageUrl: 'https://v3.fal.media/files/keyframe.jpg' });
  mockSubmitImageToVideo.mockResolvedValue({ requestId: 'fal-req-123' });
  mockUploadKeyframe.mockResolvedValue({
    storageUrl: 'https://supabase.co/storage/v1/object/public/campaign-videos/camp/vid_keyframe.jpg',
  });
});

// Helper: mock a successful write-access RPC
function mockWriteAccess(hasAccess: boolean) {
  mockRpc.mockResolvedValue({ data: hasAccess, error: null });
}

// Helper: mock the deduplication check (first admin `from` call after write access)
function mockDedup(existingSceneIds: string[] = []) {
  mockFrom.mockReturnValueOnce(
    makeChain(existingSceneIds.map((id) => ({ scene_id: id })))
  );
}

// Helper: mock the three parallel admin fetches after dedup
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

// Helper: mock the per-scene DB writes.
// New ordering: INSERT video → UPDATE image_url → UPDATE fal_request_id → INSERT video_transcripts
function mockVideoInsert(id = VIDEO_ID) {
  mockFrom
    .mockReturnValueOnce(makeChain({ id }))  // videos INSERT
    .mockReturnValueOnce(makeChain(null))    // videos UPDATE image_url
    .mockReturnValueOnce(makeChain(null))    // videos UPDATE fal_request_id
    .mockReturnValueOnce(makeChain(null));   // video_transcripts INSERT
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
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('redirects to /videos?notice=already-generated when all scenes already exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    // Dedup returns the scene as already existing
    mockFrom.mockReturnValueOnce(makeChain([{ scene_id: SCENE_ID }]));
    // vi.fn redirect() doesn't throw, so execution continues past the early redirect.
    // newSceneIds=[] after dedup, so the scenes fetch returns empty → 'No scenes found'.
    mockDataFetches({ scenes: [] });
    await generateVideo(CAMPAIGN_ID, [SCENE_ID], 'cinematic', 'My Video');
    expect(revalidatePath).toHaveBeenCalledWith('/videos');
    expect(redirect).toHaveBeenCalledWith('/videos?notice=already-generated');
  });

  it('returns error when no scenes found in DB for the campaign', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    mockDedup();
    mockDataFetches({ scenes: [] });
    const result = await generateVideo(CAMPAIGN_ID, [SCENE_ID], 'cinematic', 'My Video');
    expect(result).toEqual({ error: 'No scenes found' });
  });

  it('returns generic error when buildVideoPrompt fails for all scenes', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    mockDedup();
    mockDataFetches({});
    mockBuildVideoPrompt.mockRejectedValue(new Error('Network error'));
    const result = await generateVideo(CAMPAIGN_ID, [SCENE_ID], 'cinematic', 'My Video');
    expect(result).toEqual({ error: 'Failed to start video generation. Please try again.' });
  });

  it('returns rate-limit friendly message when 429 error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    mockDedup();
    mockDataFetches({});
    mockBuildVideoPrompt.mockRejectedValue(new Error('Request failed with status code 429'));
    const result = await generateVideo(CAMPAIGN_ID, [SCENE_ID], 'cinematic', 'My Video');
    expect(result).toEqual({ error: expect.stringContaining('rate limit') });
  });

  it('marks video row as error when generateKeyframe fails after insert', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    mockDedup();
    mockDataFetches({});
    mockFrom.mockReturnValueOnce(makeChain({ id: VIDEO_ID })); // INSERT succeeds
    mockGenerateKeyframe.mockRejectedValueOnce(new Error('FLUX timeout'));
    const cleanupChain = makeChain(null);
    mockFrom.mockReturnValueOnce(cleanupChain); // UPDATE status='error'
    const result = await generateVideo(CAMPAIGN_ID, [SCENE_ID], 'cinematic', 'My Video');
    expect(result).toEqual({ error: 'Failed to start video generation. Please try again.' });
    expect(cleanupChain.update).toHaveBeenCalledWith({ status: 'error' });
  });

  it('redirects to /videos when at least one scene succeeds', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    mockDedup();
    mockDataFetches({ scenes: [mockScene] });
    mockVideoInsert();
    const result = await generateVideo(CAMPAIGN_ID, [SCENE_ID], 'cinematic', 'My Video');
    expect(redirect).toHaveBeenCalledWith('/videos');
    expect(revalidatePath).toHaveBeenCalledWith('/videos');
    expect(result).toBeUndefined();
  });

  it('calls buildVideoPrompt with correct scene and style', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    mockDedup();
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

  it('generates keyframe and submits image-to-video after building prompt', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    mockDedup();
    mockDataFetches({});
    mockVideoInsert();
    await generateVideo(CAMPAIGN_ID, [SCENE_ID], 'cinematic', 'My Video');
    expect(mockGenerateKeyframe).toHaveBeenCalledWith(
      expect.stringContaining('a dragon rises from its lair')
    );
    expect(mockSubmitImageToVideo).toHaveBeenCalledWith(
      'https://supabase.co/storage/v1/object/public/campaign-videos/camp/vid_keyframe.jpg',
      expect.any(String),
      undefined
    );
  });

  it('uploads keyframe and stores image_url on the video row', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    mockDedup();
    mockDataFetches({});
    const insertChain  = makeChain({ id: VIDEO_ID });
    const imageUrlChain = makeChain(null);
    mockFrom
      .mockReturnValueOnce(insertChain)    // videos INSERT
      .mockReturnValueOnce(imageUrlChain)  // videos UPDATE image_url
      .mockReturnValueOnce(makeChain(null)) // videos UPDATE fal_request_id
      .mockReturnValueOnce(makeChain(null)); // video_transcripts INSERT
    await generateVideo(CAMPAIGN_ID, [SCENE_ID], 'cinematic', 'My Video');
    expect(mockUploadKeyframe).toHaveBeenCalledWith(
      'https://v3.fal.media/files/keyframe.jpg',
      CAMPAIGN_ID,
      VIDEO_ID
    );
    expect(imageUrlChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ image_url: expect.stringContaining('keyframe') })
    );
  });

  it('stores fal_request_id on the video row after Kling submit', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    mockDedup();
    mockDataFetches({});
    const insertChain   = makeChain({ id: VIDEO_ID });
    const falReqChain   = makeChain(null);
    mockFrom
      .mockReturnValueOnce(insertChain)    // videos INSERT
      .mockReturnValueOnce(makeChain(null)) // videos UPDATE image_url
      .mockReturnValueOnce(falReqChain)    // videos UPDATE fal_request_id
      .mockReturnValueOnce(makeChain(null)); // video_transcripts INSERT
    await generateVideo(CAMPAIGN_ID, [SCENE_ID], 'cinematic', 'My Video');
    expect(falReqChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ fal_request_id: 'fal-req-123' })
    );
  });

  it('video title includes collection title and scene title', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    mockDedup();
    mockDataFetches({});
    const insertChain = makeChain({ id: VIDEO_ID });
    mockFrom
      .mockReturnValueOnce(insertChain)
      .mockReturnValueOnce(makeChain(null)) // UPDATE image_url
      .mockReturnValueOnce(makeChain(null)) // UPDATE fal_request_id
      .mockReturnValueOnce(makeChain(null)); // video_transcripts
    await generateVideo(CAMPAIGN_ID, [SCENE_ID], 'cinematic', 'Epic Moments');
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Epic Moments — Dragon Awakens' })
    );
  });

  it('inserts video with fal_model set to the image-to-video model', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    mockDedup();
    mockDataFetches({});
    const insertChain = makeChain({ id: VIDEO_ID });
    mockFrom
      .mockReturnValueOnce(insertChain)
      .mockReturnValueOnce(makeChain(null))
      .mockReturnValueOnce(makeChain(null))
      .mockReturnValueOnce(makeChain(null));
    await generateVideo(CAMPAIGN_ID, [SCENE_ID], 'cinematic', 'Test');
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ fal_model: 'fal-ai/kling-video/v1.6/standard/image-to-video' })
    );
  });

  it('inserts video row before calling any fal.ai services', async () => {
    // Verifies the "insert first" ordering so no billable job is orphaned on insert failure
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    mockDedup();
    mockDataFetches({});
    mockVideoInsert();
    await generateVideo(CAMPAIGN_ID, [SCENE_ID], 'cinematic', 'My Video');
    // buildVideoPrompt runs first (before insert), then insert, then fal.ai calls
    const bvpOrder = mockBuildVideoPrompt.mock.invocationCallOrder[0];
    const insertOrder = (mockFrom as ReturnType<typeof vi.fn>).mock.invocationCallOrder[4]; // 5th call: dedup+3fetches+INSERT
    const keyframeOrder = mockGenerateKeyframe.mock.invocationCallOrder[0];
    expect(bvpOrder).toBeLessThan(insertOrder);
    expect(insertOrder).toBeLessThan(keyframeOrder);
  });

  it('marks video row as error when fal_request_id UPDATE fails after Kling submit', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    mockDedup();
    mockDataFetches({});
    const insertChain = makeChain({ id: VIDEO_ID });
    const falReqChain = makeChain(null, { message: 'connection error' });
    const cleanupChain = makeChain(null);
    mockFrom
      .mockReturnValueOnce(insertChain)     // videos INSERT
      .mockReturnValueOnce(makeChain(null)) // videos UPDATE image_url
      .mockReturnValueOnce(falReqChain)     // videos UPDATE fal_request_id (fails)
      .mockReturnValueOnce(cleanupChain);   // videos UPDATE status='error'
    const result = await generateVideo(CAMPAIGN_ID, [SCENE_ID], 'cinematic', 'My Video');
    expect(result).toEqual({ error: 'Failed to start video generation. Please try again.' });
    expect(cleanupChain.update).toHaveBeenCalledWith({ status: 'error' });
  });

  it('partial success (1 of 2 scenes fails at buildVideoPrompt) still redirects', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    mockDedup();
    mockDataFetches({ scenes: [mockScene, { ...mockScene, id: SCENE_ID_2, title: 'Second Scene' }] });
    mockBuildVideoPrompt
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({ imagePrompt: 'good image prompt', motionPrompt: 'good motion prompt' });
    mockVideoInsert();
    await generateVideo(CAMPAIGN_ID, [SCENE_ID, SCENE_ID_2], 'cinematic', 'My Video');
    expect(redirect).toHaveBeenCalledWith('/videos');
  });
});
