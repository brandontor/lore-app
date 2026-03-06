import { createAdminClient } from '@/lib/supabase/server';
import type { NPC } from '@lore/shared';

export async function getNpcById(id: string): Promise<NPC | null> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('npcs')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data as NPC;
}

export async function getNpcsByCampaign(campaignId: string): Promise<NPC[]> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('npcs')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('name');
  if (error || !data) return [];
  return data as NPC[];
}
