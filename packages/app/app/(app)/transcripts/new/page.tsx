import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getUserCampaigns } from '@/lib/queries/campaigns';
import { createTranscript } from '@/lib/actions/transcripts';
import { TranscriptNewForm } from '@/components/transcripts/TranscriptNewForm';

export default async function NewTranscriptPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign_id?: string }>;
}) {
  const { campaign_id } = await searchParams;
  const campaigns = await getUserCampaigns();

  const writableCampaigns = campaigns.filter(
    (c) => c.userRole === 'owner' || c.userRole === 'write'
  );

  if (writableCampaigns.length === 0) {
    redirect('/campaigns/new');
  }

  const selectedCampaignId = campaign_id && writableCampaigns.find((c) => c.id === campaign_id)
    ? campaign_id
    : writableCampaigns[0].id;

  async function handleCreate(formData: FormData) {
    'use server';
    const cid = formData.get('campaign_id') as string;
    return await createTranscript(cid, formData);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href="/transcripts"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Transcripts
        </Link>
      </div>

      <h1 className="mb-1 text-2xl font-bold text-zinc-900 dark:text-white">New Transcript</h1>
      <p className="mb-8 text-sm text-zinc-500">Paste your session notes or load a text file.</p>

      <TranscriptNewForm
        campaigns={writableCampaigns}
        defaultCampaignId={selectedCampaignId}
        action={handleCreate}
      />
    </div>
  );
}
