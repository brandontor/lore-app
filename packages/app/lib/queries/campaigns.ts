import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { Campaign, CampaignWithRole, CampaignMember, Invitation } from '@lore/shared';

export async function getUserCampaigns(): Promise<CampaignWithRole[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const adminClient = createAdminClient();

  // Fetch owned campaigns and memberships in parallel
  const [{ data: ownedCampaigns }, { data: memberships }] = await Promise.all([
    adminClient.from('campaigns').select('*').eq('owner_id', user.id),
    adminClient.from('campaign_members').select('campaign_id, permission').eq('user_id', user.id),
  ]);

  const memberMap = new Map(
    (memberships ?? []).map((m) => [m.campaign_id, m.permission as 'read' | 'write'])
  );

  // Fetch campaigns the user is a member of
  const memberCampaignIds = (memberships ?? []).map((m) => m.campaign_id);
  let memberCampaigns: Campaign[] = [];
  if (memberCampaignIds.length > 0) {
    const { data } = await adminClient
      .from('campaigns')
      .select('*')
      .in('id', memberCampaignIds);
    memberCampaigns = (data as Campaign[]) ?? [];
  }

  // Merge, assign roles, sort by updated_at desc
  const allCampaigns: CampaignWithRole[] = [
    ...(ownedCampaigns as Campaign[] ?? []).map((c) => ({ ...c, userRole: 'owner' as const })),
    ...memberCampaigns.map((c) => ({
      ...c,
      userRole: memberMap.get(c.id) ?? ('read' as const),
    })),
  ];

  allCampaigns.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  return allCampaigns;
}

export async function getCampaignById(id: string): Promise<CampaignWithRole | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  let userRole: 'owner' | 'read' | 'write' = 'read';
  if (data.owner_id === user.id) {
    userRole = 'owner';
  } else {
    const { data: membership } = await adminClient
      .from('campaign_members')
      .select('permission')
      .eq('campaign_id', id)
      .eq('user_id', user.id)
      .single();
    if (membership) {
      userRole = membership.permission as 'read' | 'write';
    } else {
      // No access
      return null;
    }
  }

  return { ...data, userRole };
}

export async function getCampaignMembers(campaignId: string): Promise<CampaignMember[]> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('campaign_members')
    .select('*, profile:profiles(id, display_name, avatar_url)')
    .eq('campaign_id', campaignId)
    .order('created_at');

  if (error || !data) return [];
  return data as unknown as CampaignMember[];
}

export async function getPendingInvitations(campaignId: string): Promise<Invitation[]> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('campaign_invitations')
    .select('*')
    .eq('campaign_id', campaignId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as Invitation[];
}
