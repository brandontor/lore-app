import { createAdminClient } from '@/lib/supabase/server';
import type { Character } from '@lore/shared';

export async function getCharacterById(id: string): Promise<Character | null> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('characters')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data as Character;
}

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
