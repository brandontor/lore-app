import { createAdminClient, createClient } from '@/lib/supabase/server';
import type { Video } from '@/lib/types';

export async function getVideosByCampaign(campaignId: string): Promise<Video[]> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('videos')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as Video[];
}

export async function getAllUserVideos(): Promise<Video[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const adminClient = createAdminClient();

  const [{ data: owned }, { data: memberships }] = await Promise.all([
    adminClient.from('campaigns').select('id').eq('owner_id', user.id),
    adminClient.from('campaign_members').select('campaign_id').eq('user_id', user.id),
  ]);

  const campaignIds = [
    ...(owned ?? []).map((c) => c.id),
    ...(memberships ?? []).map((m) => m.campaign_id),
  ];
  if (campaignIds.length === 0) return [];

  const { data, error } = await adminClient
    .from('videos')
    .select('*')
    .in('campaign_id', campaignIds)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as Video[];
}

export async function getVideoById(id: string): Promise<Video | null> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('videos')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as Video;
}
