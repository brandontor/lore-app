import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCampaignById, getUserCampaigns, getPendingInvitations } from '@/lib/queries/campaigns';
import { buildCampaign, OWNER_ID, MEMBER_ID, STRANGER_ID, CAMPAIGN_ID } from '../../helpers/builders';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

function makeChain(data: unknown, error: unknown = null) {
  const chain: Record<string, unknown> = {};
  ['select', 'update', 'delete', 'eq', 'in', 'is', 'order'].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.single = vi.fn().mockResolvedValue({ data, error });
  (chain as unknown as Promise<{ data: unknown; error: unknown }>).then = (
    resolve: (v: { data: unknown; error: unknown }) => unknown
  ) => Promise.resolve({ data, error }).then(resolve);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
describe('getCampaignById', () => {
  it('returns null when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    expect(await getCampaignById(CAMPAIGN_ID)).toBeNull();
  });

  it('returns campaign with userRole=owner for the owner without querying members', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom.mockReturnValueOnce(makeChain(buildCampaign({ owner_id: OWNER_ID })));
    const result = await getCampaignById(CAMPAIGN_ID);
    expect(result?.userRole).toBe('owner');
    // Only one from() call — no membership lookup needed for owner
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it('returns campaign with userRole=write for a write member', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MEMBER_ID } } });
    mockFrom
      .mockReturnValueOnce(makeChain(buildCampaign({ owner_id: OWNER_ID })))
      .mockReturnValueOnce(makeChain({ permission: 'write' }));
    const result = await getCampaignById(CAMPAIGN_ID);
    expect(result?.userRole).toBe('write');
  });

  it('returns campaign with userRole=read for a read member', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MEMBER_ID } } });
    mockFrom
      .mockReturnValueOnce(makeChain(buildCampaign({ owner_id: OWNER_ID })))
      .mockReturnValueOnce(makeChain({ permission: 'read' }));
    const result = await getCampaignById(CAMPAIGN_ID);
    expect(result?.userRole).toBe('read');
  });

  it('returns null for a user with no membership', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: STRANGER_ID } } });
    mockFrom
      .mockReturnValueOnce(makeChain(buildCampaign({ owner_id: OWNER_ID })))
      .mockReturnValueOnce(makeChain(null));
    expect(await getCampaignById(CAMPAIGN_ID)).toBeNull();
  });

  it('returns null when campaign does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom.mockReturnValueOnce(makeChain(null, { message: 'not found' }));
    expect(await getCampaignById(CAMPAIGN_ID)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe('getUserCampaigns', () => {
  it('returns empty array when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    expect(await getUserCampaigns()).toEqual([]);
  });

  it('returns owned campaigns with userRole=owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    const campaign = buildCampaign({ owner_id: OWNER_ID });
    // Promise.all: [ownedCampaigns, memberships]
    mockFrom
      .mockReturnValueOnce(makeChain([campaign]))   // owned campaigns
      .mockReturnValueOnce(makeChain([]));          // no memberships
    const result = await getUserCampaigns();
    expect(result).toHaveLength(1);
    expect(result[0].userRole).toBe('owner');
  });

  it('returns member campaigns with correct role', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MEMBER_ID } } });
    const campaign = buildCampaign({ owner_id: OWNER_ID });
    mockFrom
      .mockReturnValueOnce(makeChain([]))                              // no owned
      .mockReturnValueOnce(makeChain([{ campaign_id: CAMPAIGN_ID, permission: 'write' }]))  // membership
      .mockReturnValueOnce(makeChain([campaign]));                     // member campaign fetch
    const result = await getUserCampaigns();
    expect(result).toHaveLength(1);
    expect(result[0].userRole).toBe('write');
  });

  it('returns empty array when user has no campaigns', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom
      .mockReturnValueOnce(makeChain([]))
      .mockReturnValueOnce(makeChain([]));
    expect(await getUserCampaigns()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
describe('getPendingInvitations', () => {
  it('returns pending invitations', async () => {
    const inv = { id: 'inv-1', email: 'x@x.com', accepted_at: null };
    mockFrom.mockReturnValue(makeChain([inv]));
    const result = await getPendingInvitations(CAMPAIGN_ID);
    expect(result).toEqual([inv]);
  });

  it('returns empty array on error', async () => {
    mockFrom.mockReturnValue(makeChain(null, { message: 'error' }));
    expect(await getPendingInvitations(CAMPAIGN_ID)).toEqual([]);
  });
});
