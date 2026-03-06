'use client';

import { useActionState } from 'react';
import type { Location } from '@lore/shared';

const LOCATION_TYPES = ['dungeon', 'city', 'wilderness', 'temple', 'inn', 'forest', 'other'] as const;

interface LocationFormProps {
  action: (formData: FormData) => Promise<{ error?: string } | undefined>;
  defaultValues?: Partial<Pick<Location, 'name' | 'type' | 'description'>>;
  submitLabel?: string;
  onCancel?: () => void;
}

export function LocationForm({
  action,
  defaultValues = {},
  submitLabel = 'Save Location',
  onCancel,
}: LocationFormProps) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | undefined, formData: FormData) => {
      return await action(formData);
    },
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="loc-name" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="loc-name"
          name="name"
          type="text"
          required
          defaultValue={defaultValues.name ?? ''}
          placeholder="The Sunken Citadel"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
        />
      </div>

      <div>
        <label htmlFor="loc-type" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Type
        </label>
        <select
          id="loc-type"
          name="type"
          defaultValue={defaultValues.type ?? ''}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
        >
          <option value="">— Select type —</option>
          {LOCATION_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="loc-description" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Description
        </label>
        <textarea
          id="loc-description"
          name="description"
          rows={4}
          defaultValue={defaultValues.description ?? ''}
          placeholder="An ancient fortress half-submerged in a flooded canyon, rumored to hold the lich's phylactery…"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
        />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
        >
          {pending ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
