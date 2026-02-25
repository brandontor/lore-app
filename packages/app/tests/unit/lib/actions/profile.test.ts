import { describe, it, expect, vi, beforeEach } from 'vitest';
import { revalidatePath } from 'next/cache';
import { updateProfile } from '@/lib/actions/profile';
import { OWNER_ID } from '../../helpers/builders';

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

describe('updateProfile', () => {
  it('returns error when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await updateProfile(formData({ display_name: 'Alice' }));
    expect(result).toEqual({ error: 'Not authenticated' });
  });

  it('returns error when display_name is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    const result = await updateProfile(formData({}));
    expect(result).toEqual({ error: 'Display name is required' });
  });

  it('returns error when display_name is only whitespace', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    const result = await updateProfile(formData({ display_name: '   ' }));
    expect(result).toEqual({ error: 'Display name is required' });
  });

  it('updates profile and revalidates "/" layout on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom.mockReturnValue(makeChain(null));
    const result = await updateProfile(formData({ display_name: 'Alice' }));
    expect(result).toEqual({});
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
  });

  it('returns DB error message on failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom.mockReturnValue(makeChain(null, { message: 'update error' }));
    const result = await updateProfile(formData({ display_name: 'Alice' }));
    expect(result).toEqual({ error: 'update error' });
  });
});
