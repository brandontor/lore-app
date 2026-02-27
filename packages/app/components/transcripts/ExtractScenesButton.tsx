'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Clapperboard } from 'lucide-react';
import { extractScenes } from '@/lib/actions/transcripts';

interface ExtractScenesButtonProps {
  transcriptId: string;
  campaignId: string;
  hasScenes: boolean;
}

export function ExtractScenesButton({ transcriptId, campaignId, hasScenes }: ExtractScenesButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await extractScenes(transcriptId, campaignId);
      if (result?.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
      >
        <Clapperboard className="h-4 w-4" />
        {isPending ? 'Extracting…' : hasScenes ? 'Re-extract Scenes' : 'Extract Scenes'}
      </button>
      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
