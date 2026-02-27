import { describe, it, expect, vi, beforeEach } from 'vitest';
import { revalidatePath } from 'next/cache';
import { extractScenes, toggleSceneSelection } from '@/lib/actions/transcripts';
import { OWNER_ID, CAMPAIGN_ID } from '../../helpers/builders';

const TRANSCRIPT_ID = '00000000-0000-0000-0003-000000000001';
const SCENE_ID      = '00000000-0000-0000-0004-000000000001';

// ---- Supabase mock ----
const mockGetUser = vi.fn();
const mockFrom    = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient:      vi.fn(() => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

// Chain builder — same pattern as other action tests.
// .single() resolves with { data, error }.
// Awaiting the chain directly (no .single()) also resolves via .then.
function makeChain(data: unknown, error: unknown = null) {
  const chain: Record<string, unknown> = {};
  ['select', 'insert', 'update', 'delete', 'eq', 'in', 'is', 'order'].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.single = vi.fn().mockResolvedValue({ data, error });
  (chain as unknown as Promise<unknown>).then = (
    resolve: (v: { data: unknown; error: unknown }) => unknown
  ) => Promise.resolve({ data, error }).then(resolve);
  return chain;
}

// Helper: mock verifyWriteAccess to pass (user is owner of campaignId)
function mockWriteAccess(hasAccess: boolean) {
  if (hasAccess) {
    // campaigns returns { id } (owner) — campaign_members not checked
    mockFrom
      .mockReturnValueOnce(makeChain({ id: CAMPAIGN_ID })) // campaigns (owner check)
      .mockReturnValueOnce(makeChain(null));               // campaign_members (not needed)
  } else {
    // both return null → write = false
    mockFrom
      .mockReturnValueOnce(makeChain(null)) // campaigns (not owner)
      .mockReturnValueOnce(makeChain(null)); // campaign_members (not member)
  }
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
describe('extractScenes', () => {
  it('returns error when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await extractScenes(TRANSCRIPT_ID, CAMPAIGN_ID);
    expect(result).toEqual({ error: 'Not authenticated' });
  });

  it('returns error when user does not have write access', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(false);
    const result = await extractScenes(TRANSCRIPT_ID, CAMPAIGN_ID);
    expect(result).toEqual({ error: 'Access denied' });
  });

  it('checks access BEFORE fetching transcript data', async () => {
    // Verify auth guard runs first — access denied must not require transcript to exist
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(false);
    const result = await extractScenes(TRANSCRIPT_ID, CAMPAIGN_ID);
    // Only 2 `from` calls should have happened (verifyWriteAccess campaigns + members)
    expect(mockFrom).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ error: 'Access denied' });
  });

  it('returns error when transcript is not found (or does not belong to campaign)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    // Promise.all data fetch: transcript null, campaign ok, characters []
    mockFrom
      .mockReturnValueOnce(makeChain(null))                                      // transcripts (not found / wrong campaign)
      .mockReturnValueOnce(makeChain({ name: 'Test', setting: null, system: 'D&D 5e' })) // campaigns
      .mockReturnValueOnce(makeChain([]));                                       // characters
    const result = await extractScenes(TRANSCRIPT_ID, CAMPAIGN_ID);
    expect(result).toEqual({ error: 'Transcript not found' });
  });

  it('returns error when transcript has no content', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    mockFrom
      .mockReturnValueOnce(makeChain({ content: '   ', title: 'S1', session_number: 1 })) // transcript (empty)
      .mockReturnValueOnce(makeChain({ name: 'Test', setting: null, system: 'D&D 5e' }))
      .mockReturnValueOnce(makeChain([]));
    const result = await extractScenes(TRANSCRIPT_ID, CAMPAIGN_ID);
    expect(result).toEqual({ error: 'Transcript has no content to analyse' });
  });

  it('returns error when OPENAI_API_KEY is not set', async () => {
    const original = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    mockFrom
      .mockReturnValueOnce(makeChain({ content: 'The party arrived.', title: 'S1', session_number: 1 }))
      .mockReturnValueOnce(makeChain({ name: 'Test', setting: null, system: 'D&D 5e' }))
      .mockReturnValueOnce(makeChain([]));
    const result = await extractScenes(TRANSCRIPT_ID, CAMPAIGN_ID);
    expect(result).toEqual({ error: 'OpenAI API key not configured' });
    process.env.OPENAI_API_KEY = original;
  });
});

// ---------------------------------------------------------------------------
describe('toggleSceneSelection', () => {
  it('returns error when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await toggleSceneSelection(SCENE_ID, true);
    expect(result).toEqual({ error: 'Not authenticated' });
  });

  it('returns error when scene is not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom.mockReturnValueOnce(makeChain(null)); // transcript_scenes (not found)
    const result = await toggleSceneSelection(SCENE_ID, true);
    expect(result).toEqual({ error: 'Scene not found' });
  });

  it('returns error when user does not have write access to the scene\'s campaign', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom.mockReturnValueOnce(makeChain({ campaign_id: CAMPAIGN_ID })); // scene found
    mockWriteAccess(false); // verifyWriteAccess returns false
    const result = await toggleSceneSelection(SCENE_ID, false);
    expect(result).toEqual({ error: 'Access denied' });
  });

  it('returns {} and updates selected_for_video on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom.mockReturnValueOnce(makeChain({ campaign_id: CAMPAIGN_ID })); // scene
    mockWriteAccess(true);
    mockFrom.mockReturnValueOnce(makeChain(null)); // update
    const result = await toggleSceneSelection(SCENE_ID, true);
    expect(result).toEqual({});
  });

  it('returns error when DB update fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom.mockReturnValueOnce(makeChain({ campaign_id: CAMPAIGN_ID })); // scene
    mockWriteAccess(true);
    mockFrom.mockReturnValueOnce(makeChain(null, { message: 'update failed' })); // update error
    const result = await toggleSceneSelection(SCENE_ID, false);
    expect(result).toEqual({ error: 'update failed' });
  });

  it('does not call revalidatePath (optimistic — no page revalidation)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom.mockReturnValueOnce(makeChain({ campaign_id: CAMPAIGN_ID }));
    mockWriteAccess(true);
    mockFrom.mockReturnValueOnce(makeChain(null));
    await toggleSceneSelection(SCENE_ID, true);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
