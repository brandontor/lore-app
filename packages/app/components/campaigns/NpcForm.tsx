'use client';

import { useActionState } from 'react';
import type { NPC } from '@lore/shared';

interface NpcFormProps {
  action: (formData: FormData) => Promise<{ error?: string } | undefined>;
  defaultValues?: Partial<Pick<NPC, 'name' | 'role' | 'description' | 'appearance'>>;
  submitLabel?: string;
  onCancel?: () => void;
}

export function NpcForm({
  action,
  defaultValues = {},
  submitLabel = 'Save NPC',
  onCancel,
}: NpcFormProps) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | undefined, formData: FormData) => {
      return await action(formData);
    },
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="npc-name" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="npc-name"
          name="name"
          type="text"
          required
          defaultValue={defaultValues.name ?? ''}
          placeholder="Malachar the Betrayer"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
        />
      </div>

      <div>
        <label htmlFor="npc-role" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Role
        </label>
        <input
          id="npc-role"
          name="role"
          type="text"
          defaultValue={defaultValues.role ?? ''}
          placeholder="Villain, Ally, Shopkeeper…"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
        />
      </div>

      <div>
        <label htmlFor="npc-description" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Description
        </label>
        <textarea
          id="npc-description"
          name="description"
          rows={3}
          defaultValue={defaultValues.description ?? ''}
          placeholder="Former court advisor turned necromancer, obsessed with undying power…"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
        />
      </div>

      <div>
        <label htmlFor="npc-appearance" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Appearance
        </label>
        <textarea
          id="npc-appearance"
          name="appearance"
          rows={3}
          defaultValue={defaultValues.appearance ?? ''}
          placeholder="Gaunt figure in tattered black robes, hollow eye sockets glowing faintly violet…"
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
