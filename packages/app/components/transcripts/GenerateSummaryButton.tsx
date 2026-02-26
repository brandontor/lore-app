'use client';

import { useState, useTransition } from 'react';
import { Sparkles } from 'lucide-react';
import { generateSummary } from '@/lib/actions/transcripts';

interface GenerateSummaryButtonProps {
  transcriptId: string;
  hasSummary: boolean;
}

export function GenerateSummaryButton({ transcriptId, hasSummary }: GenerateSummaryButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await generateSummary(transcriptId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
      >
        <Sparkles className="h-4 w-4" />
        {isPending ? 'Generating…' : hasSummary ? 'Regenerate Summary' : 'Generate Summary'}
      </button>
      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
