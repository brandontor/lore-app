import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getCampaignById, getCampaignMembers, getPendingInvitations } from '@/lib/queries/campaigns';
import { InviteMemberForm } from '@/components/campaigns/InviteMemberForm';
import { MemberList } from '@/components/campaigns/MemberList';

interface MembersPageProps {
  params: Promise<{ id: string }>;
}

export default async function MembersPage({ params }: MembersPageProps) {
  const { id } = await params;
  const campaign = await getCampaignById(id);

  if (!campaign || campaign.userRole !== 'owner') notFound();

  const supabase = await createClient();
  const [{ data: ownerProfile }, members, invitations] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', campaign.owner_id).single(),
    getCampaignMembers(id),
    getPendingInvitations(id),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link
          href={`/campaigns/${id}`}
          className="inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to campaign
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-white">Members</h1>
        <p className="mt-1 text-sm text-zinc-500">{campaign.name}</p>
      </div>

      <InviteMemberForm campaignId={id} />

      <MemberList
        members={members}
        invitations={invitations}
        campaignId={id}
        ownerName={ownerProfile?.display_name ?? 'Dungeon Master'}
      />
    </div>
  );
}
