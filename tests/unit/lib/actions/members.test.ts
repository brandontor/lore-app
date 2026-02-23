import { describe, it, expect, vi, beforeEach } from 'vitest';
import { revalidatePath } from 'next/cache';
import { updateMemberPermission, removeMember } from '@/lib/actions/members';
import { OWNER_ID, CAMPAIGN_ID } from '../../helpers/builders';

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

const MEMBER_ROW_ID = 'member-row-001';

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
describe('updateMemberPermission', () => {
  it('returns error when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await updateMemberPermission(MEMBER_ROW_ID, CAMPAIGN_ID, 'write');
    expect(result).toEqual({ error: 'Not authenticated' });
  });

  it('returns error when member row not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom.mockReturnValueOnce(makeChain(null));
    const result = await updateMemberPermission(MEMBER_ROW_ID, CAMPAIGN_ID, 'write');
    expect(result).toEqual({ error: 'Member not found' });
  });

  it('returns error when caller does not own the campaign', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom
      .mockReturnValueOnce(makeChain({ campaign_id: CAMPAIGN_ID }))
      .mockReturnValueOnce(makeChain(null)); // ownership check fails
    const result = await updateMemberPermission(MEMBER_ROW_ID, CAMPAIGN_ID, 'write');
    expect(result).toEqual({ error: 'Access denied' });
  });

  it('returns {} and revalidates on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom
      .mockReturnValueOnce(makeChain({ campaign_id: CAMPAIGN_ID }))
      .mockReturnValueOnce(makeChain({ id: CAMPAIGN_ID }))
      .mockReturnValueOnce(makeChain(null));
    const result = await updateMemberPermission(MEMBER_ROW_ID, CAMPAIGN_ID, 'write');
    expect(result).toEqual({});
    expect(revalidatePath).toHaveBeenCalledWith(`/campaigns/${CAMPAIGN_ID}/members`);
  });

  it('returns DB error on update failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom
      .mockReturnValueOnce(makeChain({ campaign_id: CAMPAIGN_ID }))
      .mockReturnValueOnce(makeChain({ id: CAMPAIGN_ID }))
      .mockReturnValueOnce(makeChain(null, { message: 'update failed' }));
    const result = await updateMemberPermission(MEMBER_ROW_ID, CAMPAIGN_ID, 'write');
    expect(result).toEqual({ error: 'update failed' });
  });
});

// ---------------------------------------------------------------------------
describe('removeMember', () => {
  it('returns error when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await removeMember(MEMBER_ROW_ID, CAMPAIGN_ID);
    expect(result).toEqual({ error: 'Not authenticated' });
  });

  it('returns error when member row not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom.mockReturnValueOnce(makeChain(null));
    const result = await removeMember(MEMBER_ROW_ID, CAMPAIGN_ID);
    expect(result).toEqual({ error: 'Member not found' });
  });

  it('returns error when caller does not own the campaign', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom
      .mockReturnValueOnce(makeChain({ campaign_id: CAMPAIGN_ID }))
      .mockReturnValueOnce(makeChain(null));
    const result = await removeMember(MEMBER_ROW_ID, CAMPAIGN_ID);
    expect(result).toEqual({ error: 'Access denied' });
  });

  it('returns {} and revalidates on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom
      .mockReturnValueOnce(makeChain({ campaign_id: CAMPAIGN_ID }))
      .mockReturnValueOnce(makeChain({ id: CAMPAIGN_ID }))
      .mockReturnValueOnce(makeChain(null));
    const result = await removeMember(MEMBER_ROW_ID, CAMPAIGN_ID);
    expect(result).toEqual({});
    expect(revalidatePath).toHaveBeenCalledWith(`/campaigns/${CAMPAIGN_ID}/members`);
  });

  it('returns DB error on delete failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom
      .mockReturnValueOnce(makeChain({ campaign_id: CAMPAIGN_ID }))
      .mockReturnValueOnce(makeChain({ id: CAMPAIGN_ID }))
      .mockReturnValueOnce(makeChain(null, { message: 'delete failed' }));
    const result = await removeMember(MEMBER_ROW_ID, CAMPAIGN_ID);
    expect(result).toEqual({ error: 'delete failed' });
  });
});
