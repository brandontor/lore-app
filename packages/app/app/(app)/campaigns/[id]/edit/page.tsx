import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getCampaignById } from '@/lib/queries/campaigns';
import { updateCampaign } from '@/lib/actions/campaigns';
import { CampaignForm } from '@/components/campaigns/CampaignForm';

interface EditCampaignPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCampaignPage({ params }: EditCampaignPageProps) {
  const { id } = await params;
  const campaign = await getCampaignById(id);

  if (!campaign || campaign.userRole !== 'owner') notFound();

  const action = updateCampaign.bind(null, id);

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <Link
          href={`/campaigns/${id}`}
          className="inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to campaign
        </Link>
      </div>

      <h1 className="mb-1 text-2xl font-bold text-zinc-900 dark:text-white">Edit Campaign</h1>
      <p className="mb-8 text-sm text-zinc-500">{campaign.name}</p>

      <CampaignForm
        action={action}
        defaultValues={{
          name: campaign.name,
          description: campaign.description ?? '',
          system: campaign.system,
          setting: campaign.setting ?? '',
          status: campaign.status,
        }}
        submitLabel="Save Changes"
        showStatus
      />
    </div>
  );
}
