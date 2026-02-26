import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getCampaignById } from '@/lib/queries/campaigns';
import { createTranscript } from '@/lib/actions/transcripts';
import { TranscriptForm } from '@/components/transcripts/TranscriptForm';

interface NewTranscriptPageProps {
  params: Promise<{ id: string }>;
}

export default async function NewTranscriptPage({ params }: NewTranscriptPageProps) {
  const { id } = await params;
  const campaign = await getCampaignById(id);

  if (!campaign) notFound();

  const canWrite = campaign.userRole === 'owner' || campaign.userRole === 'write';
  if (!canWrite) notFound();

  const action = createTranscript.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/campaigns/${id}`}
          className="inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to campaign
        </Link>
      </div>

      <h1 className="mb-1 text-2xl font-bold text-zinc-900 dark:text-white">New Transcript</h1>
      <p className="mb-8 text-sm text-zinc-500">{campaign.name}</p>

      <TranscriptForm action={action} submitLabel="Create Transcript" />
    </div>
  );
}
