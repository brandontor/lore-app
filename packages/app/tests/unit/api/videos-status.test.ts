import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OWNER_ID, CAMPAIGN_ID } from '../helpers/builders';

const VIDEO_ID      = '00000000-0000-0000-0005-000000000001';
const FAL_REQUEST_ID = 'fal-req-abc123';

// ---- next/server mock ----
vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

// ---- Supabase mock ----
const mockGetUser = vi.fn();
const mockRpc     = vi.fn();
const mockFrom    = vi.fn();
const mockUpload  = vi.fn();
const mockStorageFrom = vi.fn(() => ({ upload: mockUpload }));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
  })),
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    storage: { from: mockStorageFrom },
  })),
}));

// ---- fal mock ----
const mockGetFalStatus = vi.fn();
vi.mock('@/lib/fal', () => ({
  getFalStatus:        (...args: unknown[]) => mockGetFalStatus(...args),
  isFalVideoUrl:       (url: string) => url.startsWith('https://v3.fal.media/'),
  DEFAULT_CLIP_DURATION: 5,
}));

// ---- global fetch mock ----
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Chain builder — all methods return chain; .then resolves for await support
function makeChain(data: unknown, error: unknown = null) {
  const chain: Record<string, unknown> = {};
  ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'is', 'single'].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  // Override single to resolve properly
  chain.single = vi.fn().mockResolvedValue({ data, error });
  // Allow `await chain` (for non-.single() awaits)
  // @ts-expect-error — makeChain .then mock is intentionally loosely typed
  (chain as unknown as Promise<unknown>).then = (
    resolve: (v: { data: unknown; error: unknown }) => unknown
  ) => Promise.resolve({ data, error }).then(resolve);
  return chain;
}

function makeParams(id = VIDEO_ID) {
  return Promise.resolve({ id });
}

function makePendingVideo(overrides = {}) {
  return {
    id: VIDEO_ID,
    status: 'pending',
    fal_request_id: FAL_REQUEST_ID,
    storage_path: null,
    campaign_id: CAMPAIGN_ID,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
  mockRpc.mockResolvedValue({ data: true, error: null }); // has campaign access by default
  mockUpload.mockResolvedValue({ error: null });
});

import { GET } from '@/app/api/videos/[id]/status/route';

// ---------------------------------------------------------------------------
describe('GET /api/videos/[id]/status', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(new Request('http://localhost'), { params: makeParams() });
    expect(res.status).toBe(401);
  });

  it('returns 404 when video does not exist', async () => {
    mockFrom.mockReturnValueOnce(makeChain(null, { message: 'not found' }));
    const res = await GET(new Request('http://localhost'), { params: makeParams() });
    expect(res.status).toBe(404);
  });

  it('returns 404 (not 403) when user lacks campaign access — hides video existence', async () => {
    mockFrom.mockReturnValueOnce(makeChain(makePendingVideo()));
    mockRpc.mockResolvedValue({ data: false, error: null }); // no access
    const res = await GET(new Request('http://localhost'), { params: makeParams() });
    expect(res.status).toBe(404);
  });

  it('returns immediately for already-completed video without calling fal.ai', async () => {
    mockFrom.mockReturnValueOnce(
      makeChain(makePendingVideo({ status: 'completed', storage_path: 'camp/vid.mp4' }))
    );
    const res = await GET(new Request('http://localhost'), { params: makeParams() });
    const body = await res.json();
    expect(body.status).toBe('completed');
    expect(mockGetFalStatus).not.toHaveBeenCalled();
  });

  it('returns immediately for already-errored video without calling fal.ai', async () => {
    mockFrom.mockReturnValueOnce(makeChain(makePendingVideo({ status: 'error' })));
    const res = await GET(new Request('http://localhost'), { params: makeParams() });
    const body = await res.json();
    expect(body.status).toBe('error');
    expect(mockGetFalStatus).not.toHaveBeenCalled();
  });

  it('returns current status if fal_request_id is missing', async () => {
    mockFrom.mockReturnValueOnce(makeChain(makePendingVideo({ fal_request_id: null })));
    const res = await GET(new Request('http://localhost'), { params: makeParams() });
    const body = await res.json();
    expect(body.status).toBe('pending');
    expect(mockGetFalStatus).not.toHaveBeenCalled();
  });

  it('returns pending status when fal.ai reports IN_QUEUE (no DB change)', async () => {
    mockFrom.mockReturnValueOnce(makeChain(makePendingVideo())); // video fetch only
    mockGetFalStatus.mockResolvedValue({ status: 'IN_QUEUE' });
    const res = await GET(new Request('http://localhost'), { params: makeParams() });
    const body = await res.json();
    expect(body.status).toBe('pending');
  });

  it('updates DB status to processing when fal.ai reports IN_PROGRESS', async () => {
    const updateChain = makeChain(null);
    mockFrom
      .mockReturnValueOnce(makeChain(makePendingVideo())) // video fetch
      .mockReturnValueOnce(updateChain);                   // update
    mockGetFalStatus.mockResolvedValue({ status: 'IN_PROGRESS' });
    const res = await GET(new Request('http://localhost'), { params: makeParams() });
    const body = await res.json();
    expect(body.status).toBe('processing');
    expect(updateChain.update).toHaveBeenCalledWith({ status: 'processing' });
  });

  it('marks video as error when fal.ai reports FAILED', async () => {
    const updateChain = makeChain(null);
    mockFrom
      .mockReturnValueOnce(makeChain(makePendingVideo()))
      .mockReturnValueOnce(updateChain);
    mockGetFalStatus.mockResolvedValue({ status: 'FAILED' });
    const res = await GET(new Request('http://localhost'), { params: makeParams() });
    const body = await res.json();
    expect(body.status).toBe('error');
    expect(updateChain.update).toHaveBeenCalledWith({ status: 'error' });
  });

  it('rejects fal.ai video URLs not on the allowlist and marks completed with null path', async () => {
    const updateChain = makeChain(null);
    mockFrom
      .mockReturnValueOnce(makeChain(makePendingVideo()))          // video fetch
      .mockReturnValueOnce(makeChain({ clip_duration: 5 }))        // clip_duration fetch
      .mockReturnValueOnce(updateChain);
    mockGetFalStatus.mockResolvedValue({
      status: 'COMPLETED',
      videoUrl: 'https://evil.com/malicious.mp4',
    });
    await GET(new Request('http://localhost'), { params: makeParams() });
    // fetch should NOT be called for disallowed URLs
    expect(mockFetch).not.toHaveBeenCalled();
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed', storage_path: null })
    );
  });

  it('marks completed with null storage_path when content-type is not video/', async () => {
    const updateChain = makeChain(null);
    mockFrom
      .mockReturnValueOnce(makeChain(makePendingVideo()))          // video fetch
      .mockReturnValueOnce(makeChain({ clip_duration: 5 }))        // clip_duration fetch
      .mockReturnValueOnce(updateChain);
    mockGetFalStatus.mockResolvedValue({
      status: 'COMPLETED',
      videoUrl: 'https://v3.fal.media/files/video.mp4',
    });
    mockFetch.mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/html' },
      arrayBuffer: vi.fn(),
    });
    await GET(new Request('http://localhost'), { params: makeParams() });
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed', storage_path: null })
    );
  });

  it('uses .neq guard on DB update to prevent concurrent-poll race', async () => {
    const updateChain = makeChain(null);
    mockFrom
      .mockReturnValueOnce(makeChain(makePendingVideo()))          // video fetch
      .mockReturnValueOnce(makeChain({ clip_duration: 10 }))       // clip_duration fetch
      .mockReturnValueOnce(updateChain);
    mockGetFalStatus.mockResolvedValue({
      status: 'COMPLETED',
      videoUrl: 'https://v3.fal.media/files/video.mp4',
    });
    mockFetch.mockResolvedValue({
      ok: true,
      headers: { get: () => 'video/mp4' },
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
    });
    await GET(new Request('http://localhost'), { params: makeParams() });
    // The update chain should have .neq('status', 'completed') chained on
    expect(updateChain.neq).toHaveBeenCalledWith('status', 'completed');
  });
});
