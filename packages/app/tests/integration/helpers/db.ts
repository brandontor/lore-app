import { createClient } from '@supabase/supabase-js';

export const adminDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export interface TestUser {
  id: string;
  email: string;
  accessToken: string;
}

export async function createTestUser(
  email: string,
  password = 'Password123!'
): Promise<TestUser> {
  const { data, error } = await adminDb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: email.split('@')[0] },
  });
  if (error || !data.user) throw new Error(`createTestUser failed: ${error?.message}`);

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const { data: session, error: signInError } = await anonClient.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError || !session.session) {
    throw new Error(`signIn failed: ${signInError?.message}`);
  }

  return { id: data.user.id, email, accessToken: session.session.access_token };
}

export async function seedCampaign(
  ownerId: string,
  overrides: Record<string, unknown> = {}
): Promise<string> {
  const { data, error } = await adminDb
    .from('campaigns')
    .insert({
      name: 'Integration Test Campaign',
      system: 'D&D 5e',
      owner_id: ownerId,
      ...overrides,
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`seedCampaign failed: ${error?.message}`);
  return data.id as string;
}

export async function seedMember(
  campaignId: string,
  userId: string,
  invitedBy: string,
  permission: 'read' | 'write' = 'read'
): Promise<void> {
  const { error } = await adminDb.from('campaign_members').insert({
    campaign_id: campaignId,
    user_id: userId,
    invited_by: invitedBy,
    permission,
  });
  if (error) throw new Error(`seedMember failed: ${error.message}`);
}

export async function seedInvitation(
  campaignId: string,
  invitedBy: string,
  email: string,
  permission: 'read' | 'write' = 'read'
): Promise<{ id: string; token: string }> {
  const { data, error } = await adminDb
    .from('campaign_invitations')
    .insert({ campaign_id: campaignId, invited_by: invitedBy, email, permission })
    .select('id, token')
    .single();
  if (error || !data) throw new Error(`seedInvitation failed: ${error?.message}`);
  return data as { id: string; token: string };
}

export async function teardown(userIds: string[]): Promise<void> {
  for (const id of userIds) {
    await adminDb.auth.admin.deleteUser(id);
    // Cascades: campaigns → campaign_members, campaign_invitations, etc.
  }
}
