import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import {
  createTestUser,
  seedCampaign,
  seedMember,
  teardown,
  type TestUser,
} from './helpers/db';

/**
 * Integration tests for campaign access control.
 *
 * These tests call the Supabase DB directly (not the query functions) so that
 * RLS policies and the getCampaignById logic can be verified end-to-end with a
 * real Postgres instance. Run `npx supabase start && npx supabase db reset` first.
 */

let dm: TestUser;
let writer: TestUser;
let reader: TestUser;
let stranger: TestUser;
let campaignId: string;

beforeAll(async () => {
  dm      = await createTestUser('dm@lore-test.local');
  writer  = await createTestUser('player-write@lore-test.local');
  reader  = await createTestUser('player-read@lore-test.local');
  stranger = await createTestUser('stranger@lore-test.local');
  campaignId = await seedCampaign(dm.id, { name: 'Integration Campaign' });
  await seedMember(campaignId, writer.id, dm.id, 'write');
  await seedMember(campaignId, reader.id, dm.id, 'read');
});

afterAll(async () => {
  await teardown([dm.id, writer.id, reader.id, stranger.id]);
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

describe('campaign access control (real DB)', () => {
  it('owner can read their campaign', async () => {
    const { data, error } = await clientFor(dm)
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();
    expect(error).toBeNull();
    expect(data?.id).toBe(campaignId);
  });

  it('write member can read the campaign', async () => {
    const { data, error } = await clientFor(writer)
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();
    expect(error).toBeNull();
    expect(data?.id).toBe(campaignId);
  });

  it('read member can read the campaign', async () => {
    const { data, error } = await clientFor(reader)
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();
    expect(error).toBeNull();
    expect(data?.id).toBe(campaignId);
  });

  it('stranger cannot read the campaign (RLS blocks)', async () => {
    const { data } = await clientFor(stranger)
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();
    // RLS returns no rows for unauthorized users
    expect(data).toBeNull();
  });

  it('stranger cannot read campaign_members', async () => {
    const { data } = await clientFor(stranger)
      .from('campaign_members')
      .select('*')
      .eq('campaign_id', campaignId);
    expect(data).toHaveLength(0);
  });

  it('member cannot delete campaign (owner-only)', async () => {
    const { error } = await clientFor(writer)
      .from('campaigns')
      .delete()
      .eq('id', campaignId);
    // RLS policy prevents deletion by non-owner
    expect(error).not.toBeNull();
  });
});
