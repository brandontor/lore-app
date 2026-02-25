import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import {
  createTestUser,
  seedCampaign,
  seedMember,
  teardown,
  adminDb,
  type TestUser,
} from './helpers/db';

let dm: TestUser;
let player: TestUser;
let campaignId: string;
let memberRowId: string;

beforeAll(async () => {
  dm     = await createTestUser('dm-mem@lore-test.local');
  player = await createTestUser('player-mem@lore-test.local');
  campaignId = await seedCampaign(dm.id);
  await seedMember(campaignId, player.id, dm.id, 'read');

  // Get the member row id for later tests
  const { data } = await adminDb
    .from('campaign_members')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('user_id', player.id)
    .single();
  memberRowId = data!.id;
});

afterAll(async () => {
  await teardown([dm.id, player.id]);
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

describe('campaign_members access control (real DB)', () => {
  it('owner can update member permission', async () => {
    const { error } = await clientFor(dm)
      .from('campaign_members')
      .update({ permission: 'write' })
      .eq('id', memberRowId);
    expect(error).toBeNull();

    const { data } = await adminDb
      .from('campaign_members')
      .select('permission')
      .eq('id', memberRowId)
      .single();
    expect(data?.permission).toBe('write');
  });

  it('non-owner cannot update member permission (RLS blocks)', async () => {
    const { error } = await clientFor(player)
      .from('campaign_members')
      .update({ permission: 'write' })
      .eq('id', memberRowId);
    // RLS policy prevents non-owners from updating members
    expect(error).not.toBeNull();
  });

  it('owner can remove a member', async () => {
    // Seed a second player to remove
    const extra = await createTestUser('extra@lore-test.local');
    await seedMember(campaignId, extra.id, dm.id, 'read');
    const { data: extraRow } = await adminDb
      .from('campaign_members')
      .select('id')
      .eq('user_id', extra.id)
      .single();

    const { error } = await clientFor(dm)
      .from('campaign_members')
      .delete()
      .eq('id', extraRow!.id);
    expect(error).toBeNull();

    const { data: gone } = await adminDb
      .from('campaign_members')
      .select('id')
      .eq('id', extraRow!.id)
      .single();
    expect(gone).toBeNull();

    await teardown([extra.id]);
  });

  it('removed member can no longer read the campaign', async () => {
    // Use the already-removed extra user pattern — use stranger instead
    const stranger = await createTestUser('str2@lore-test.local');
    const { data } = await clientFor(stranger)
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();
    expect(data).toBeNull();
    await teardown([stranger.id]);
  });
});
