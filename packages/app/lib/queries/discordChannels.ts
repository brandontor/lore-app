import { createClient } from '@/lib/supabase/server';

export interface DiscordChannelConfig {
  channel_id: string;
  campaign_id: string;
  created_at: string;
  guild_name: string | null;
  channel_name: string | null;
}

export async function getDiscordChannelsByCampaign(campaignId: string): Promise<DiscordChannelConfig[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('discord_channel_configs')
    .select('channel_id, campaign_id, created_at, guild_name, channel_name')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true });
  return data ?? [];
}
