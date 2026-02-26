import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { createCampaign } from '@/lib/actions/campaigns';
import { CampaignForm } from '@/components/campaigns/CampaignForm';

export default function NewCampaignPage() {
  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to campaigns
        </Link>
      </div>

      <h1 className="mb-1 text-2xl font-bold text-zinc-900 dark:text-white">New Campaign</h1>
      <p className="mb-8 text-sm text-zinc-500">
        Create a campaign and start adding sessions, characters, and generated videos.
      </p>

      <CampaignForm action={createCampaign} submitLabel="Create Campaign" />
    </div>
  );
}
