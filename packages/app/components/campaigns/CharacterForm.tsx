'use client';

import { useActionState } from 'react';
import type { Character } from '@lore/shared';

interface CharacterFormProps {
  action: (formData: FormData) => Promise<{ error?: string } | undefined>;
  defaultValues?: Partial<Pick<Character, 'name' | 'class' | 'race' | 'level' | 'appearance' | 'backstory'>>;
  submitLabel?: string;
  onCancel?: () => void;
}

export function CharacterForm({
  action,
  defaultValues = {},
  submitLabel = 'Save Character',
  onCancel,
}: CharacterFormProps) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | undefined, formData: FormData) => {
      return await action(formData);
    },
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label htmlFor="char-name" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="char-name"
            name="name"
            type="text"
            required
            defaultValue={defaultValues.name ?? ''}
            placeholder="Theron Ashwood"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
          />
        </div>

        <div>
          <label htmlFor="char-class" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Class
          </label>
          <input
            id="char-class"
            name="class"
            type="text"
            defaultValue={defaultValues.class ?? ''}
            placeholder="Wizard"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
          />
        </div>

        <div>
          <label htmlFor="char-race" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Race
          </label>
          <input
            id="char-race"
            name="race"
            type="text"
            defaultValue={defaultValues.race ?? ''}
            placeholder="High Elf"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
          />
        </div>

        <div>
          <label htmlFor="char-level" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Level
          </label>
          <input
            id="char-level"
            name="level"
            type="number"
            min={1}
            max={20}
            defaultValue={defaultValues.level ?? 1}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label htmlFor="char-appearance" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Appearance
        </label>
        <textarea
          id="char-appearance"
          name="appearance"
          rows={3}
          defaultValue={defaultValues.appearance ?? ''}
          placeholder="Tall High Elf with silver robes, cold blue eyes, and a gnarled oak staff"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
        />
      </div>

      <div>
        <label htmlFor="char-backstory" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Backstory
        </label>
        <textarea
          id="char-backstory"
          name="backstory"
          rows={4}
          defaultValue={defaultValues.backstory ?? ''}
          placeholder="Former court mage seeking redemption after a catastrophic mistake…"
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
