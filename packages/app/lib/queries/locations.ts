import { createAdminClient } from '@/lib/supabase/server';
import type { Location } from '@lore/shared';

export async function getLocationById(id: string): Promise<Location | null> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('locations')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data as Location;
}

export async function getLocationsByCampaign(campaignId: string): Promise<Location[]> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('locations')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('name');
  if (error || !data) return [];
  return data as Location[];
}
