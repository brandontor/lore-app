import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { updateProfile } from '@/lib/actions/profile';
import { ProfileForm } from '@/components/profile/ProfileForm';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 text-2xl font-bold text-zinc-900 dark:text-white">Profile Settings</h1>
      <p className="mb-8 text-sm text-zinc-500">Update your display name and account info.</p>

      <ProfileForm
        defaultDisplayName={profile?.display_name ?? ''}
        email={user.email ?? ''}
        action={updateProfile}
      />
    </div>
  );
}
