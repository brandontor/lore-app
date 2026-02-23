'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { ActionResult, Permission } from '@/lib/types';

export async function updateMemberPermission(
  memberId: string,
  campaignId: string,
  permission: Permission
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const adminClient = createAdminClient();

  // Verify the caller owns the campaign this member belongs to
  const { data: member } = await adminClient
    .from('campaign_members')
    .select('campaign_id')
    .eq('id', memberId)
    .single();

  if (!member) return { error: 'Member not found' };

  const { data: campaign } = await adminClient
    .from('campaigns')
    .select('id')
    .eq('id', member.campaign_id)
    .eq('owner_id', user.id)
    .single();

  if (!campaign) return { error: 'Access denied' };

  const { error } = await adminClient
    .from('campaign_members')
    .update({ permission })
    .eq('id', memberId)
    .eq('campaign_id', campaignId);

  if (error) return { error: error.message };

  revalidatePath(`/campaigns/${campaignId}/members`);
  return {};
}

export async function removeMember(
  memberId: string,
  campaignId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const adminClient = createAdminClient();

  // Verify the caller owns the campaign this member belongs to
  const { data: member } = await adminClient
    .from('campaign_members')
    .select('campaign_id')
    .eq('id', memberId)
    .single();

  if (!member) return { error: 'Member not found' };

  const { data: campaign } = await adminClient
    .from('campaigns')
    .select('id')
    .eq('id', member.campaign_id)
    .eq('owner_id', user.id)
    .single();

  if (!campaign) return { error: 'Access denied' };

  const { error } = await adminClient
    .from('campaign_members')
    .delete()
    .eq('id', memberId)
    .eq('campaign_id', campaignId);

  if (error) return { error: error.message };

  revalidatePath(`/campaigns/${campaignId}/members`);
  return {};
}
