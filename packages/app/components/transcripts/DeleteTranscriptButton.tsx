'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { deleteTranscript } from '@/lib/actions/transcripts';

interface Props {
  transcriptId: string;
}

export function DeleteTranscriptButton({ transcriptId }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm('Delete this transcript? This cannot be undone.')) return;
    startTransition(async () => {
      await deleteTranscript(transcriptId);
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <Button variant="danger" type="submit" disabled={isPending}>
        {isPending ? 'Deleting…' : 'Delete'}
      </Button>
    </form>
  );
}
