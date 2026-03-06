import { describe, it, expect, vi, beforeEach } from 'vitest';
import { revalidatePath } from 'next/cache';
import { createLocation, updateLocation, deleteLocation, updateLocationImage } from '@/lib/actions/locations';
import { OWNER_ID, CAMPAIGN_ID, LOCATION_ID } from '../../helpers/builders';

// ---- Supabase mock ----
const mockGetUser = vi.fn();
const mockRpc     = vi.fn();
const mockFrom    = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient:      vi.fn(() => ({ auth: { getUser: mockGetUser }, rpc: mockRpc })),
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

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

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

function mockWriteAccess(hasAccess: boolean) {
  mockRpc.mockResolvedValue({ data: hasAccess, error: null });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
describe('createLocation', () => {
  it('returns error when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await createLocation(CAMPAIGN_ID, formData({ name: 'The Citadel' }));
    expect(result).toEqual({ error: 'Not authenticated' });
  });

  it('returns error when name is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    const result = await createLocation(CAMPAIGN_ID, formData({}));
    expect(result).toEqual({ error: 'Location name is required' });
  });

  it('returns error when user lacks write access', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(false);
    const result = await createLocation(CAMPAIGN_ID, formData({ name: 'The Citadel' }));
    expect(result).toEqual({ error: 'Access denied' });
  });

  it('returns {} and revalidates on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    mockFrom.mockReturnValue(makeChain(null));
    const result = await createLocation(CAMPAIGN_ID, formData({ name: 'The Citadel', type: 'dungeon' }));
    expect(result).toEqual({});
    expect(revalidatePath).toHaveBeenCalledWith(`/campaigns/${CAMPAIGN_ID}`);
  });

  it('returns DB error on failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockWriteAccess(true);
    mockFrom.mockReturnValue(makeChain(null, { message: 'insert error' }));
    const result = await createLocation(CAMPAIGN_ID, formData({ name: 'The Citadel' }));
    expect(result).toEqual({ error: 'insert error' });
  });
});

// ---------------------------------------------------------------------------
describe('updateLocation', () => {
  it('returns error when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await updateLocation(LOCATION_ID, formData({ name: 'The Citadel' }));
    expect(result).toEqual({ error: 'Not authenticated' });
  });

  it('returns error when name is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom.mockReturnValue(makeChain({ campaign_id: CAMPAIGN_ID }));
    mockWriteAccess(true);
    const result = await updateLocation(LOCATION_ID, formData({}));
    expect(result).toEqual({ error: 'Location name is required' });
  });

  it('returns error when location not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom.mockReturnValue(makeChain(null));
    const result = await updateLocation(LOCATION_ID, formData({ name: 'The Citadel' }));
    expect(result).toEqual({ error: 'Location not found' });
  });

  it('returns error when user lacks write access', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom.mockReturnValue(makeChain({ campaign_id: CAMPAIGN_ID }));
    mockWriteAccess(false);
    const result = await updateLocation(LOCATION_ID, formData({ name: 'The Citadel' }));
    expect(result).toEqual({ error: 'Access denied' });
  });

  it('returns {} and revalidates on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom
      .mockReturnValueOnce(makeChain({ campaign_id: CAMPAIGN_ID }))
      .mockReturnValueOnce(makeChain(null));
    mockWriteAccess(true);
    const result = await updateLocation(LOCATION_ID, formData({ name: 'Updated Name' }));
    expect(result).toEqual({});
    expect(revalidatePath).toHaveBeenCalledWith(`/campaigns/${CAMPAIGN_ID}`);
  });
});

// ---------------------------------------------------------------------------
describe('deleteLocation', () => {
  it('returns error when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await deleteLocation(LOCATION_ID);
    expect(result).toEqual({ error: 'Not authenticated' });
  });

  it('returns error when location not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom.mockReturnValue(makeChain(null));
    const result = await deleteLocation(LOCATION_ID);
    expect(result).toEqual({ error: 'Location not found' });
  });

  it('returns error when user lacks write access', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom.mockReturnValue(makeChain({ campaign_id: CAMPAIGN_ID }));
    mockWriteAccess(false);
    const result = await deleteLocation(LOCATION_ID);
    expect(result).toEqual({ error: 'Access denied' });
  });

  it('returns {} and revalidates on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom
      .mockReturnValueOnce(makeChain({ campaign_id: CAMPAIGN_ID }))
      .mockReturnValueOnce(makeChain(null));
    mockWriteAccess(true);
    const result = await deleteLocation(LOCATION_ID);
    expect(result).toEqual({});
    expect(revalidatePath).toHaveBeenCalledWith(`/campaigns/${CAMPAIGN_ID}`);
  });
});

// ---------------------------------------------------------------------------
describe('updateLocationImage', () => {
  const validUrl = `https://example.supabase.co/storage/v1/object/public/location-images/uid/loc-id/image`;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  });

  it('returns error when unauthenticated — checked before URL validation', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await updateLocationImage(LOCATION_ID, validUrl);
    expect(result).toEqual({ error: 'Not authenticated' });
  });

  it('returns error for invalid URL prefix', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    const result = await updateLocationImage(LOCATION_ID, 'https://evil.com/image.jpg');
    expect(result).toEqual({ error: 'Invalid image URL' });
  });

  it('returns error when location not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom.mockReturnValue(makeChain(null));
    const result = await updateLocationImage(LOCATION_ID, validUrl);
    expect(result).toEqual({ error: 'Location not found' });
  });

  it('returns {} and revalidates on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom
      .mockReturnValueOnce(makeChain({ campaign_id: CAMPAIGN_ID }))
      .mockReturnValueOnce(makeChain(null));
    mockWriteAccess(true);
    const result = await updateLocationImage(LOCATION_ID, validUrl);
    expect(result).toEqual({});
    expect(revalidatePath).toHaveBeenCalledWith(`/campaigns/${CAMPAIGN_ID}`);
  });
});
