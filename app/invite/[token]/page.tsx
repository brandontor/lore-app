import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { acceptInvitation } from '@/lib/actions/invitations';

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

async function getInvitation(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_invitation_by_token', { p_token: token });
  if (error || !data || data.length === 0) return null;
  return data[0] as {
    id: string;
    campaign_id: string;
    campaign_name: string;
    email: string;
    permission: string;
    expires_at: string;
    accepted_at: string | null;
  };
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const invitation = await getInvitation(token);

  if (!invitation) {
    return <InviteError message="This invitation link is invalid or has expired." />;
  }

  if (invitation.accepted_at) {
    return <InviteError message="This invitation has already been accepted." />;
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return <InviteError message="This invitation has expired. Ask your Dungeon Master to send a new one." />;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/invite/${token}`);
  }

  const emailMatches = user.email?.toLowerCase() === invitation.email.toLowerCase();
  const permissionLabel = invitation.permission === 'write' ? 'view and edit' : 'view';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <BookOpen className="h-7 w-7 text-violet-400" />
          <span className="text-2xl font-bold text-white">Lore</span>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <h1 className="mb-2 text-2xl font-bold text-white">Campaign Invitation</h1>
          <p className="mb-6 text-zinc-400">
            You&apos;ve been invited to join{' '}
            <strong className="text-white">{invitation.campaign_name}</strong> with{' '}
            <strong className="text-violet-400">{permissionLabel}</strong> access.
          </p>

          {!emailMatches && (
            <div className="mb-6 rounded-lg bg-amber-500/10 px-4 py-3 text-left text-sm text-amber-400">
              <p className="font-medium">Note</p>
              <p>
                This invitation was sent to <strong>{invitation.email}</strong>. You&apos;re
                currently signed in as <strong>{user.email}</strong>.
              </p>
            </div>
          )}

          <AcceptForm token={token} />

          <p className="mt-4 text-xs text-zinc-600">
            Not you?{' '}
            <Link href="/login" className="text-zinc-400 underline hover:text-zinc-300">
              Sign in with a different account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function AcceptForm({ token }: { token: string }) {
  async function accept() {
    'use server';
    await acceptInvitation(token);
  }

  return (
    <form action={accept}>
      <button
        type="submit"
        className="w-full rounded-lg bg-violet-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
      >
        Accept Invitation
      </button>
    </form>
  );
}

function InviteError({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex items-center justify-center gap-2">
          <BookOpen className="h-7 w-7 text-violet-400" />
          <span className="text-2xl font-bold text-white">Lore</span>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8">
          <h1 className="mb-2 text-xl font-bold text-white">Invitation Unavailable</h1>
          <p className="mb-6 text-zinc-400">{message}</p>
          <Link
            href="/login"
            className="inline-block rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
