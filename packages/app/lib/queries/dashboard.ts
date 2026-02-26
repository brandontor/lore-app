import { createClient } from '@/lib/supabase/server';

export interface DashboardStats {
  campaignCount: number;
  transcriptCount: number;
  videoCount: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { campaignCount: 0, transcriptCount: 0, videoCount: 0 };

  const [{ data: owned }, { data: memberships }] = await Promise.all([
    supabase.from('campaigns').select('id').eq('owner_id', user.id),
    supabase.from('campaign_members').select('campaign_id').eq('user_id', user.id),
  ]);

  const campaignIds = [
    ...(owned ?? []).map((c) => c.id),
    ...(memberships ?? []).map((m) => m.campaign_id),
  ];

  const campaignCount = campaignIds.length;
  if (campaignCount === 0) return { campaignCount: 0, transcriptCount: 0, videoCount: 0 };

  const [{ count: transcriptCount }, { count: videoCount }] = await Promise.all([
    supabase
      .from('transcripts')
      .select('id', { count: 'exact', head: true })
      .in('campaign_id', campaignIds),
    supabase
      .from('videos')
      .select('id', { count: 'exact', head: true })
      .in('campaign_id', campaignIds),
  ]);

  return {
    campaignCount,
    transcriptCount: transcriptCount ?? 0,
    videoCount: videoCount ?? 0,
  };
}
