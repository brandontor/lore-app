'use client';

import { useActionState, useState } from 'react';
import type { CampaignWithRole } from '@lore/shared';

interface TranscriptNewFormProps {
  campaigns: CampaignWithRole[];
  defaultCampaignId: string;
  action: (formData: FormData) => Promise<{ error?: string } | undefined>;
}

const MAX_FILE_BYTES = 5_000_000;

export function TranscriptNewForm({ campaigns, defaultCampaignId, action }: TranscriptNewFormProps) {
  const [content, setContent] = useState('');
  const [fileError, setFileError] = useState('');

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | undefined, formData: FormData) => {
      return await action(formData);
    },
    undefined
  );

  function handleFileLoad(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError('');
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setFileError('File is too large. Maximum size is 5 MB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') setContent(ev.target.result);
    };
    reader.readAsText(file);
  }

  return (
    <form action={formAction} className="space-y-5">
      {/* Campaign selector */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Campaign <span className="text-red-500">*</span>
        </label>
        <select
          name="campaign_id"
          defaultValue={defaultCampaignId}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
        >
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          name="title"
          type="text"
          required
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
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Duration (min)
          </label>
          <input
            name="duration_minutes"
            type="number"
            min={1}
            placeholder="120"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
          />
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Content <span className="text-red-500">*</span>
          </label>
          <label className="cursor-pointer text-xs text-violet-600 hover:text-violet-500 dark:text-violet-400">
            Load from file (.txt, .md)
            <input type="file" accept=".txt,.md" className="hidden" onChange={handleFileLoad} />
          </label>
        </div>
        {fileError && (
          <p className="mb-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{fileError}</p>
        )}
        <textarea
          name="content"
          rows={16}
          required
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste or load your session transcript here…"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 font-mono text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
        />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Create Transcript'}
      </button>
    </form>
  );
}
