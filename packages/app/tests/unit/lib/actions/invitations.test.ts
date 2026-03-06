import { describe, it, expect, vi, beforeEach } from 'vitest';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sendInvitation, acceptInvitation, revokeInvitation } from '@/lib/actions/invitations';
import { OWNER_ID, CAMPAIGN_ID } from '../../helpers/builders';

// ---- Supabase mock ----
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({ from: mockFrom, rpc: mockRpc })),
}));

vi.mock('@/lib/email/resend', () => ({
  sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
}));

import { sendInvitationEmail } from '@/lib/email/resend';
const mockSendEmail = sendInvitationEmail as ReturnType<typeof vi.fn>;

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
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
});

// ---------------------------------------------------------------------------
describe('sendInvitation', () => {
  it('returns error when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await sendInvitation(CAMPAIGN_ID, formData({ email: 'x@x.com', permission: 'read' }));
    expect(result).toEqual({ error: 'Not authenticated' });
  });

  it('returns error when email is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    const result = await sendInvitation(CAMPAIGN_ID, formData({ permission: 'read' }));
    expect(result).toEqual({ error: 'Email is required' });
  });

  it('returns error for invalid permission', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    const result = await sendInvitation(CAMPAIGN_ID, formData({ email: 'x@x.com', permission: 'admin' }));
    expect(result).toEqual({ error: 'Invalid permission' });
  });

  it('returns error when campaign not found or caller is not owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    // Promise.all returns [{ data: null }, { data: profile }]
    mockFrom
      .mockReturnValueOnce(makeChain(null))   // campaign not found
      .mockReturnValueOnce(makeChain({ display_name: 'DM' }));
    const result = await sendInvitation(CAMPAIGN_ID, formData({ email: 'x@x.com', permission: 'read' }));
    expect(result).toEqual({ error: 'Campaign not found or access denied' });
  });

  it('returns duplicate error for code 23505', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom
      .mockReturnValueOnce(makeChain({ id: CAMPAIGN_ID, name: 'Camp', owner_id: OWNER_ID }))
      .mockReturnValueOnce(makeChain({ display_name: 'DM' }))
      .mockReturnValueOnce(makeChain(null, { code: '23505', message: 'unique violation' }));
    const result = await sendInvitation(CAMPAIGN_ID, formData({ email: 'x@x.com', permission: 'read' }));
    expect(result).toEqual({ error: 'An invitation for this email already exists' });
  });

  it('returns DB error message on other insert failures', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom
      .mockReturnValueOnce(makeChain({ id: CAMPAIGN_ID, name: 'Camp', owner_id: OWNER_ID }))
      .mockReturnValueOnce(makeChain({ display_name: 'DM' }))
      .mockReturnValueOnce(makeChain(null, { code: '99999', message: 'db error' }));
    const result = await sendInvitation(CAMPAIGN_ID, formData({ email: 'x@x.com', permission: 'read' }));
    expect(result).toEqual({ error: 'db error' });
  });

  it('succeeds even when sendInvitationEmail throws', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom
      .mockReturnValueOnce(makeChain({ id: CAMPAIGN_ID, name: 'Camp', owner_id: OWNER_ID }))
      .mockReturnValueOnce(makeChain({ display_name: 'DM' }))
      .mockReturnValueOnce(makeChain({ token: 'abc123' }));
    mockSendEmail.mockRejectedValueOnce(new Error('SMTP down'));
    const result = await sendInvitation(CAMPAIGN_ID, formData({ email: 'x@x.com', permission: 'read' }));
    expect(result).toEqual({});
    expect(revalidatePath).toHaveBeenCalledWith(`/campaigns/${CAMPAIGN_ID}/members`);
  });

  it('revalidates and returns {} on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom
      .mockReturnValueOnce(makeChain({ id: CAMPAIGN_ID, name: 'Camp', owner_id: OWNER_ID }))
      .mockReturnValueOnce(makeChain({ display_name: 'DM' }))
      .mockReturnValueOnce(makeChain({ token: 'abc123' }));
    const result = await sendInvitation(CAMPAIGN_ID, formData({ email: 'x@x.com', permission: 'read' }));
    expect(result).toEqual({});
    expect(revalidatePath).toHaveBeenCalledWith(`/campaigns/${CAMPAIGN_ID}/members`);
  });
});

// ---------------------------------------------------------------------------
describe('acceptInvitation', () => {
  it('returns error when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await acceptInvitation('some-token');
    expect(result).toEqual({ error: 'Not authenticated' });
  });

  it('returns RPC error message on failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockRpc.mockResolvedValue({ data: null, error: { message: 'invitation expired' } });
    const result = await acceptInvitation('bad-token');
    expect(result).toEqual({ error: 'invitation expired' });
  });

  it('redirects to campaign on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockRpc.mockResolvedValue({ data: CAMPAIGN_ID, error: null });
    await acceptInvitation('good-token');
    expect(revalidatePath).toHaveBeenCalledWith('/campaigns');
    expect(redirect).toHaveBeenCalledWith(`/campaigns/${CAMPAIGN_ID}`);
  });
});

// ---------------------------------------------------------------------------
describe('revokeInvitation', () => {
  const INV_ID = 'inv-001';

  it('returns error when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await revokeInvitation(INV_ID, CAMPAIGN_ID);
    expect(result).toEqual({ error: 'Not authenticated' });
  });

  it('returns error when invitation not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom.mockReturnValueOnce(makeChain(null)); // invitation lookup returns null
    const result = await revokeInvitation(INV_ID, CAMPAIGN_ID);
    expect(result).toEqual({ error: 'Invitation not found' });
  });

  it('returns error when caller does not own the campaign', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom
      .mockReturnValueOnce(makeChain({ campaign_id: CAMPAIGN_ID })) // invitation found
      .mockReturnValueOnce(makeChain(null)); // campaign ownership check fails
    const result = await revokeInvitation(INV_ID, CAMPAIGN_ID);
    expect(result).toEqual({ error: 'Access denied' });
  });

  it('deletes invitation and revalidates on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom
      .mockReturnValueOnce(makeChain({ campaign_id: CAMPAIGN_ID }))
      .mockReturnValueOnce(makeChain({ id: CAMPAIGN_ID }))
      .mockReturnValueOnce(makeChain(null));
    const result = await revokeInvitation(INV_ID, CAMPAIGN_ID);
    expect(result).toEqual({});
    expect(revalidatePath).toHaveBeenCalledWith(`/campaigns/${CAMPAIGN_ID}/members`);
  });

  it('returns DB error on delete failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockFrom
      .mockReturnValueOnce(makeChain({ campaign_id: CAMPAIGN_ID }))
      .mockReturnValueOnce(makeChain({ id: CAMPAIGN_ID }))
      .mockReturnValueOnce(makeChain(null, { message: 'delete failed' }));
    const result = await revokeInvitation(INV_ID, CAMPAIGN_ID);
    expect(result).toEqual({ error: 'delete failed' });
  });
});
