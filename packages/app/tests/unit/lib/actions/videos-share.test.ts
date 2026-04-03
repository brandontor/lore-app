import { describe, it, expect, vi, beforeEach } from 'vitest';
import { revalidatePath } from 'next/cache';
import { shareVideo, unshareVideo } from '@/lib/actions/videos';
import { CAMPAIGN_ID, OWNER_ID } from '../../helpers/builders';

// ---- Supabase mock ----
const mockGetUser = vi.fn();
const mockRpc     = vi.fn();
const mockFrom    = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient:      vi.fn(() => ({ auth: { getUser: mockGetUser }, rpc: mockRpc })),
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

// fal / video-processing are not used by share actions but the module imports them;
// stub them to avoid ESM issues
vi.mock('@/lib/fal', () => ({
  buildVideoPrompt: vi.fn(),
  generateKeyframe: vi.fn(),
  submitImageToVideoFal: vi.fn(),
  FAL_VIDEO_MODEL: 'fal-ai/kling-video/v2.1/pro/image-to-video',
  DEFAULT_MOTION_INTENSITY: 0.5,
  DEFAULT_CLIP_DURATION: 5,
}));
vi.mock('@/lib/video-processing', () => ({ uploadKeyframe: vi.fn() }));
vi.mock('next/cache',      () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

const VIDEO_ID = '00000000-0000-0000-0005-000000000001';

function makeChain(data: unknown, error: unknown = null) {
  const chain: Record<string, unknown> = {};
  ['select', 'insert', 'update', 'eq', 'in', 'neq', 'is', 'order'].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.single = vi.fn().mockResolvedValue({ data, error });
  // @ts-expect-error — intentionally loose
  (chain as unknown as Promise<unknown>).then = (
    resolve: (v: { data: unknown; error: unknown }) => unknown
  ) => Promise.resolve({ data, error }).then(resolve);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
  mockRpc.mockResolvedValue({ data: true });
});

// ─── shareVideo ───────────────────────────────────────────────────────────────

describe('shareVideo', () => {
  it('returns error when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await shareVideo(VIDEO_ID);
    expect(result.error).toBe('Not authenticated');
  });

  it('returns error when video not found', async () => {
    mockFrom.mockReturnValue(makeChain(null, { message: 'not found' }));
    const result = await shareVideo(VIDEO_ID);
    expect(result.error).toBe('Video not found');
  });

  it('returns error when video is not completed', async () => {
    mockFrom.mockReturnValue(
      makeChain({ campaign_id: CAMPAIGN_ID, status: 'pending' })
    );
    const result = await shareVideo(VIDEO_ID);
    expect(result.error).toBe('Only completed videos can be shared');
  });

  it('returns error when user lacks write access', async () => {
    mockFrom.mockReturnValue(
      makeChain({ campaign_id: CAMPAIGN_ID, status: 'completed' })
    );
    mockRpc.mockResolvedValue({ data: false });
    const result = await shareVideo(VIDEO_ID);
    expect(result.error).toBe('Access denied');
  });

  it('generates share token and returns shareUrl on success', async () => {
    const videoChain = makeChain({ campaign_id: CAMPAIGN_ID, status: 'completed' });
    const updateChain = makeChain({ share_token: 'test-token' });
    mockFrom
      .mockReturnValueOnce(videoChain)   // fetch video
      .mockReturnValueOnce(updateChain); // update with token

    const result = await shareVideo(VIDEO_ID);

    expect(result.error).toBeUndefined();
    expect(result.data?.token).toBeDefined();
    expect(result.data?.shareUrl).toContain('/share/');
    expect(revalidatePath).toHaveBeenCalledWith(`/videos/${VIDEO_ID}`);
  });
});

// ─── unshareVideo ─────────────────────────────────────────────────────────────

describe('unshareVideo', () => {
  it('returns error when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await unshareVideo(VIDEO_ID);
    expect(result.error).toBe('Not authenticated');
  });

  it('returns error when video not found', async () => {
    mockFrom.mockReturnValue(makeChain(null, { message: 'not found' }));
    const result = await unshareVideo(VIDEO_ID);
    expect(result.error).toBe('Video not found');
  });

  it('returns error when user lacks write access', async () => {
    mockFrom.mockReturnValue(makeChain({ campaign_id: CAMPAIGN_ID }));
    mockRpc.mockResolvedValue({ data: false });
    const result = await unshareVideo(VIDEO_ID);
    expect(result.error).toBe('Access denied');
  });

  it('clears share fields and revalidates on success', async () => {
    const videoChain = makeChain({ campaign_id: CAMPAIGN_ID });
    const updateChain = makeChain(null);
    mockFrom
      .mockReturnValueOnce(videoChain)
      .mockReturnValueOnce(updateChain);

    const result = await unshareVideo(VIDEO_ID);

    expect(result.error).toBeUndefined();
    expect(revalidatePath).toHaveBeenCalledWith(`/videos/${VIDEO_ID}`);
  });
});
