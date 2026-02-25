'use client';

import { useTransition } from 'react';
import { User } from 'lucide-react';
import { updateMemberPermission, removeMember } from '@/lib/actions/members';
import { revokeInvitation } from '@/lib/actions/invitations';
import { Badge } from '@/components/ui/Badge';
import type { CampaignMember, Invitation, Permission } from '@lore/shared';

interface MemberListProps {
  members: CampaignMember[];
  invitations: Invitation[];
  campaignId: string;
  ownerName: string;
}

export function MemberList({ members, invitations, campaignId, ownerName }: MemberListProps) {
  return (
    <div className="space-y-6">
      {/* Current members */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Members</h2>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {/* Owner row — always first */}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40">
                <User className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-white">{ownerName}</p>
                <p className="text-xs text-zinc-500">Owner</p>
              </div>
            </div>
            <Badge variant="default">Owner</Badge>
          </div>

          {members.length === 0 && (
            <p className="px-6 py-4 text-sm text-zinc-500">No other members yet.</p>
          )}

          {members.map((member) => (
            <MemberRow key={member.id} member={member} campaignId={campaignId} />
          ))}
        </div>
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
              Pending Invitations
            </h2>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {invitations.map((inv) => (
              <InvitationRow key={inv.id} invitation={inv} campaignId={campaignId} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MemberRow({
  member,
  campaignId,
}: {
  member: CampaignMember;
  campaignId: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handlePermissionChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const permission = e.target.value as Permission;
    startTransition(async () => {
      await updateMemberPermission(member.id, campaignId, permission);
    });
  }

  function handleRemove() {
    startTransition(async () => {
      await removeMember(member.id, campaignId);
    });
  }

  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
          <User className="h-4 w-4 text-zinc-500" />
        </div>
        <p className="text-sm font-medium text-zinc-900 dark:text-white">
          {member.profile?.display_name ?? 'Unknown'}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={member.permission}
          onChange={handlePermissionChange}
          disabled={isPending}
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-700 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        >
          <option value="read">View only</option>
          <option value="write">View & edit</option>
        </select>
        <button
          onClick={handleRemove}
          disabled={isPending}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/10"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function InvitationRow({
  invitation,
  campaignId,
}: {
  invitation: Invitation;
  campaignId: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleRevoke() {
    startTransition(async () => {
      await revokeInvitation(invitation.id, campaignId);
    });
  }

  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div>
        <p className="text-sm font-medium text-zinc-900 dark:text-white">{invitation.email}</p>
        <p className="text-xs text-zinc-500">
          {invitation.permission === 'write' ? 'View & edit' : 'View only'} ·{' '}
          Expires {new Date(invitation.expires_at).toLocaleDateString()}
        </p>
      </div>

      <button
        onClick={handleRevoke}
        disabled={isPending}
        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
      >
        Revoke
      </button>
    </div>
  );
}
