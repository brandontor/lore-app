import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getUserCampaigns } from '@/lib/queries/campaigns';
import { CampaignProvider } from '@/context/CampaignContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [{ data: profile }, campaigns] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user.id).single(),
    getUserCampaigns(),
  ]);

  const cookieStore = await cookies();
  const cookieCampaignId = cookieStore.get('active_campaign_id')?.value ?? null;
  const initialActiveCampaignId =
    campaigns.some((c) => c.id === cookieCampaignId)
      ? cookieCampaignId
      : (campaigns[0]?.id ?? null);

  return (
    <CampaignProvider campaigns={campaigns} initialActiveCampaignId={initialActiveCampaignId}>
      <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar
            displayName={profile?.display_name || user.email?.split('@')[0] || 'Player'}
            campaigns={campaigns}
          />
          <main className="flex-1 overflow-y-auto p-8">
            {children}
          </main>
        </div>
      </div>
    </CampaignProvider>
  );
}
