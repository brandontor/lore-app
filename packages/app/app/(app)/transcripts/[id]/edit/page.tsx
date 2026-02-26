import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getTranscriptById } from '@/lib/queries/transcripts';
import { getCampaignById } from '@/lib/queries/campaigns';
import { updateTranscript } from '@/lib/actions/transcripts';
import { TranscriptForm } from '@/components/transcripts/TranscriptForm';

interface EditTranscriptPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTranscriptPage({ params }: EditTranscriptPageProps) {
  const { id } = await params;

  const transcript = await getTranscriptById(id);
  if (!transcript) notFound();

  const campaign = await getCampaignById(transcript.campaign_id);
  if (!campaign) notFound();

  const canWrite = campaign.userRole === 'owner' || campaign.userRole === 'write';
  if (!canWrite) notFound();

  const action = updateTranscript.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/transcripts/${id}`}
          className="inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to transcript
        </Link>
      </div>

      <h1 className="mb-1 text-2xl font-bold text-zinc-900 dark:text-white">Edit Transcript</h1>
      <p className="mb-8 text-sm text-zinc-500">{campaign.name}</p>

      <TranscriptForm
        action={action}
        defaultValues={{
          title: transcript.title,
          session_number: transcript.session_number,
          session_date: transcript.session_date,
          duration_minutes: transcript.duration_minutes,
          content: transcript.content,
          status: transcript.status,
        }}
        showStatus
        submitLabel="Save Changes"
      />
    </div>
  );
}
