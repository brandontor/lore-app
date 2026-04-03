import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getReelByTranscript } from '@/lib/queries/videos';
import { ReelPlayer } from './ReelPlayer';

interface ReelPageProps {
  params: Promise<{ transcriptId: string }>;
}

export default async function ReelPage({ params }: ReelPageProps) {
  const { transcriptId } = await params;
  const reel = await getReelByTranscript(transcriptId);

  if (!reel || reel.videos.length === 0) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/videos"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Videos
      </Link>
      <ReelPlayer
        videos={reel.videos}
        transcriptTitle={reel.transcript.title}
        sessionNumber={reel.transcript.session_number}
      />
    </div>
  );
}
