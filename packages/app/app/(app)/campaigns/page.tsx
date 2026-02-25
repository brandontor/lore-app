import Link from 'next/link';
import { Plus, Sword } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { getUserCampaigns } from '@/lib/queries/campaigns';

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'default'> = {
  active: 'success',
  paused: 'warning',
  completed: 'default',
  archived: 'default',
};

export default async function CampaignsPage() {
  const campaigns = await getUserCampaigns();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Campaigns</h1>
          <p className="mt-1 text-sm text-zinc-500">Your D&D campaigns.</p>
        </div>
        <Link href="/campaigns/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          icon={Sword}
          title="No campaigns yet"
          description="Create your first campaign to start tracking sessions and generating videos."
          action={
            <Link href="/campaigns/new">
              <Button>
                <Plus className="h-4 w-4" />
                New Campaign
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardContent>
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950">
                      <Sword className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={STATUS_BADGE[campaign.status] ?? 'default'}>
                        {campaign.status}
                      </Badge>
                      {campaign.userRole !== 'owner' && (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                          {campaign.userRole}
                        </span>
                      )}
                    </div>
                  </div>
                  <h3 className="mb-1 font-semibold text-zinc-900 dark:text-zinc-100">
                    {campaign.name}
                  </h3>
                  <p className="mb-3 text-sm text-zinc-500">{campaign.system}</p>
                  <div className="text-xs text-zinc-400">
                    {campaign.setting ?? 'No setting specified'}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
