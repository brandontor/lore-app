'use client';

import { useActionState } from 'react';

type FormState = { error?: string; success?: boolean } | undefined;

interface ProfileFormProps {
  defaultDisplayName: string;
  email: string;
  action: (formData: FormData) => Promise<{ error?: string } | undefined>;
}

export function ProfileForm({ defaultDisplayName, email, action }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const result = await action(formData);
      if (result?.error) return { error: result.error };
      return { success: true };
    },
    undefined
  );

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Email
        </label>
        <input
          type="email"
          value={email}
          disabled
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
        />
        <p className="mt-1 text-xs text-zinc-400">Email cannot be changed here.</p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Display Name <span className="text-red-500">*</span>
        </label>
        <input
          name="display_name"
          type="text"
          required
          defaultValue={defaultDisplayName}
          placeholder="Your name"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
        />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{state.error}</p>
      )}
      {state?.success && (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
          Profile updated successfully.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Save Changes'}
      </button>
    </form>
  );
}
