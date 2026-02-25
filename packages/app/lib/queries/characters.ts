import { createAdminClient } from '@/lib/supabase/server';
import type { Character } from '@lore/shared';

export async function getCharactersByCampaign(campaignId: string): Promise<Character[]> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('characters')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('name');

  if (error || !data) return [];
  return data as Character[];
}
