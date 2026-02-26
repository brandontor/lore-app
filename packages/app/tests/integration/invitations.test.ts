import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import {
  createTestUser,
  seedCampaign,
  seedInvitation,
  teardown,
  adminDb,
  type TestUser,
} from './helpers/db';

let dm: TestUser;
let invitee: TestUser;
let campaignId: string;

beforeAll(async () => {
  dm      = await createTestUser('dm-inv@lore-test.local');
  invitee = await createTestUser('invitee@lore-test.local');
  campaignId = await seedCampaign(dm.id);
});

afterAll(async () => {
  await teardown([dm.id, invitee.id]);
});

function clientFor(user: TestUser) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${user.accessToken}` } },
    }
  );
}

describe('accept_campaign_invitation RPC', () => {
  it('happy path: atomically inserts member and sets accepted_at', async () => {
    const { token } = await seedInvitation(campaignId, dm.id, invitee.email, 'read');

    const { data: returnedCampaignId, error } = await clientFor(invitee).rpc(
      'accept_campaign_invitation',
      { p_token: token, p_user_id: invitee.id }
    );

    expect(error).toBeNull();
    expect(returnedCampaignId).toBe(campaignId);

    // Verify membership was created
    const { data: member } = await adminDb
      .from('campaign_members')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('user_id', invitee.id)
      .single();
    expect(member).not.toBeNull();

    // Verify invitation is marked accepted
    const { data: inv } = await adminDb
      .from('campaign_invitations')
      .select('accepted_at')
      .eq('token', token)
      .single();
    expect(inv?.accepted_at).not.toBeNull();
  });

  it('returns error for an already-accepted invitation', async () => {
    const { token } = await seedInvitation(campaignId, dm.id, 'already@lore-test.local', 'read');
    // Accept once
    await clientFor(invitee).rpc('accept_campaign_invitation', {
      p_token: token,
      p_user_id: invitee.id,
    });
    // Accept again
    const { error } = await clientFor(invitee).rpc('accept_campaign_invitation', {
      p_token: token,
      p_user_id: invitee.id,
    });
    expect(error).not.toBeNull();
  });

  it('returns error for a non-existent token', async () => {
    const { error } = await clientFor(invitee).rpc('accept_campaign_invitation', {
      p_token: 'non-existent-token-xyz',
      p_user_id: invitee.id,
    });
    expect(error).not.toBeNull();
  });

  it('returns error for an expired invitation', async () => {
    // Seed invitation with past expires_at using adminDb
    const { data, error: seedErr } = await adminDb
      .from('campaign_invitations')
      .insert({
        campaign_id: campaignId,
        invited_by: dm.id,
        email: 'expired@lore-test.local',
        permission: 'read',
        expires_at: new Date(Date.now() - 1000).toISOString(),
      })
      .select('token')
      .single();
    expect(seedErr).toBeNull();

    const { error } = await clientFor(invitee).rpc('accept_campaign_invitation', {
      p_token: data!.token,
      p_user_id: invitee.id,
    });
    expect(error).not.toBeNull();
  });
});
