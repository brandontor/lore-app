'use client';

import { useActionState } from 'react';
import { sendInvitation } from '@/lib/actions/invitations';

interface InviteMemberFormProps {
  campaignId: string;
}

export function InviteMemberForm({ campaignId }: InviteMemberFormProps) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | undefined, formData: FormData) => {
      return await sendInvitation(campaignId, formData);
    },
    undefined
  );

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-1 text-base font-semibold text-zinc-900 dark:text-white">Invite a player</h2>
      <p className="mb-4 text-sm text-zinc-500">
        They&apos;ll receive an email with a link to join the campaign.
      </p>

      <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Email address
          </label>
          <input
            name="email"
            type="email"
            required
            placeholder="player@example.com"
            className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
          />
        </div>

        <div className="w-36">
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Access
          </label>
          <select
            name="permission"
            defaultValue="read"
            className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          >
            <option value="read">View only</option>
            <option value="write">View & edit</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
        >
          {pending ? 'Sending…' : 'Send invite'}
        </button>
      </form>

      {state?.error && (
        <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}
      {state && !state.error && (
        <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          Invitation sent successfully.
        </p>
      )}
    </div>
  );
}
