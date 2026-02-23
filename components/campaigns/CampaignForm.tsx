'use client';

import { useActionState } from 'react';
import type { CampaignStatus } from '@/lib/types';

const SYSTEMS = ['D&D 5e', 'Pathfinder 2e', 'Call of Cthulhu', 'Vampire: The Masquerade', 'Other'];
const STATUSES: { value: CampaignStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

interface CampaignFormProps {
  action: (formData: FormData) => Promise<{ error?: string } | undefined>;
  defaultValues?: {
    name?: string;
    description?: string;
    system?: string;
    setting?: string;
    status?: CampaignStatus;
  };
  submitLabel?: string;
  showStatus?: boolean;
}

export function CampaignForm({
  action,
  defaultValues = {},
  submitLabel = 'Create Campaign',
  showStatus = false,
}: CampaignFormProps) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | undefined, formData: FormData) => {
      return await action(formData);
    },
    undefined
  );

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Campaign name <span className="text-red-500">*</span>
        </label>
        <input
          name="name"
          type="text"
          required
          defaultValue={defaultValues.name}
          placeholder="The Sunken City of Mal'zar"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Description
        </label>
        <textarea
          name="description"
          rows={3}
          defaultValue={defaultValues.description ?? ''}
          placeholder="A brief overview of the campaign story and setting…"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            System
          </label>
          <select
            name="system"
            defaultValue={defaultValues.system ?? 'D&D 5e'}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          >
            {SYSTEMS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {showStatus && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Status
            </label>
            <select
              name="status"
              defaultValue={defaultValues.status ?? 'active'}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          World / Setting
        </label>
        <input
          name="setting"
          type="text"
          defaultValue={defaultValues.setting ?? ''}
          placeholder="Forgotten Realms, Homebrew, etc."
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
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
