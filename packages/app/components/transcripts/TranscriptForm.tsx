'use client';

import { useActionState, useRef } from 'react';
import type { TranscriptStatus } from '@lore/shared';

const STATUSES: { value: TranscriptStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'processed', label: 'Processed' },
  { value: 'error', label: 'Error' },
];

interface TranscriptFormProps {
  action: (formData: FormData) => Promise<{ error?: string } | undefined>;
  defaultValues?: {
    title?: string;
    session_number?: number | null;
    session_date?: string | null;
    duration_minutes?: number | null;
    content?: string;
    status?: TranscriptStatus;
  };
  showStatus?: boolean;
  submitLabel?: string;
}

export function TranscriptForm({
  action,
  defaultValues = {},
  showStatus = false,
  submitLabel = 'Create Transcript',
}: TranscriptFormProps) {
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | undefined, formData: FormData) => {
      return await action(formData);
    },
    undefined
  );

  function handleFileLoad(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !contentRef.current) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (contentRef.current && typeof ev.target?.result === 'string') {
        contentRef.current.value = ev.target.result;
      }
    };
    reader.readAsText(file);
  }

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          name="title"
          type="text"
          required
          defaultValue={defaultValues.title ?? ''}
          placeholder="Session 1 — The Beginning"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Session #
          </label>
          <input
            name="session_number"
            type="number"
            min={1}
            defaultValue={defaultValues.session_number ?? ''}
            placeholder="1"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Session Date
          </label>
          <input
            name="session_date"
            type="date"
            defaultValue={defaultValues.session_date?.slice(0, 10) ?? ''}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Duration (minutes)
          </label>
          <input
            name="duration_minutes"
            type="number"
            min={1}
            defaultValue={defaultValues.duration_minutes ?? ''}
            placeholder="120"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
          />
        </div>
      </div>

      {showStatus && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Status
          </label>
          <select
            name="status"
            defaultValue={defaultValues.status ?? 'processed'}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Content <span className="text-red-500">*</span>
          </label>
          <label className="cursor-pointer text-xs text-violet-600 hover:text-violet-500 dark:text-violet-400">
            Load from file (.txt, .md)
            <input
              type="file"
              accept=".txt,.md"
              className="hidden"
              onChange={handleFileLoad}
            />
          </label>
        </div>
        <textarea
          ref={contentRef}
          name="content"
          rows={16}
          required
          defaultValue={defaultValues.content ?? ''}
          placeholder="Paste or load your session transcript here…"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 font-mono text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
        />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
      >
        {pending ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
