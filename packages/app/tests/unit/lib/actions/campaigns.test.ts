import { describe, it, expect, vi, beforeEach } from 'vitest';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createCampaign, updateCampaign, deleteCampaign } from '@/lib/actions/campaigns';
import { OWNER_ID, CAMPAIGN_ID } from '../../helpers/builders';

// ---- Supabase mock ----
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

function makeChain(data: unknown, error: unknown = null) {
  const chain: Record<string, unknown> = {};
  ['select', 'insert', 'update', 'delete', 'eq', 'in', 'is', 'order'].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.single = vi.fn().mockResolvedValue({ data, error });
  // @ts-expect-error — makeChain .then mock is intentionally loosely typed
  (chain as unknown as Promise<unknown>).then = (
    resolve: (v: { data: unknown; error: unknown }) => unknown
  ) => Promise.resolve({ data, error }).then(resolve);
  return chain;
}

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
describe('createCampaign', () => {
  it('returns error when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await createCampaign(formData({ name: 'Test' }));
    expect(result).toEqual({ error: 'Not authenticated' });
  });

  it('returns error when name is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    const result = await createCampaign(formData({}));
    expect(result).toEqual({ error: 'Campaign name is required' });
  });

  it('returns error when name is only whitespace', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    const result = await createCampaign(formData({ name: '   ' }));
    expect(result).toEqual({ error: 'Campaign name is required' });
  });

  it('redirects to new campaign page on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom.mockReturnValue(makeChain({ id: 'new-campaign-id' }));
    await createCampaign(formData({ name: 'My Campaign' }));
    expect(revalidatePath).toHaveBeenCalledWith('/campaigns');
    expect(redirect).toHaveBeenCalledWith('/campaigns/new-campaign-id');
  });

  it('returns DB error message on failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom.mockReturnValue(makeChain(null, { message: 'insert error' }));
    const result = await createCampaign(formData({ name: 'My Campaign' }));
    expect(result).toEqual({ error: 'insert error' });
  });
});

// ---------------------------------------------------------------------------
describe('updateCampaign', () => {
  it('returns error when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await updateCampaign(CAMPAIGN_ID, formData({ name: 'New Name' }));
    expect(result).toEqual({ error: 'Not authenticated' });
  });

  it('returns error when name is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    const result = await updateCampaign(CAMPAIGN_ID, formData({}));
    expect(result).toEqual({ error: 'Campaign name is required' });
  });

  it('redirects to campaign page on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom.mockReturnValue(makeChain(null));
    await updateCampaign(CAMPAIGN_ID, formData({ name: 'Updated', status: 'active' }));
    expect(revalidatePath).toHaveBeenCalledWith(`/campaigns/${CAMPAIGN_ID}`);
    expect(redirect).toHaveBeenCalledWith(`/campaigns/${CAMPAIGN_ID}`);
  });

  it('returns DB error message on failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom.mockReturnValue(makeChain(null, { message: 'update error' }));
    const result = await updateCampaign(CAMPAIGN_ID, formData({ name: 'Updated', status: 'active' }));
    expect(result).toEqual({ error: 'update error' });
  });
});

// ---------------------------------------------------------------------------
describe('deleteCampaign', () => {
  it('returns error when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await deleteCampaign(CAMPAIGN_ID);
    expect(result).toEqual({ error: 'Not authenticated' });
  });

  it('redirects to /campaigns on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom.mockReturnValue(makeChain(null));
    await deleteCampaign(CAMPAIGN_ID);
    expect(revalidatePath).toHaveBeenCalledWith('/campaigns');
    expect(redirect).toHaveBeenCalledWith('/campaigns');
  });

  it('returns DB error message on failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom.mockReturnValue(makeChain(null, { message: 'delete error' }));
    const result = await deleteCampaign(CAMPAIGN_ID);
    expect(result).toEqual({ error: 'delete error' });
  });
});
