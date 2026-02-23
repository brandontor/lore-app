'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/lib/types';

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const display_name = (formData.get('display_name') as string)?.trim();
  if (!display_name) return { error: 'Display name is required' };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('profiles')
    .update({ display_name })
    .eq('id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/', 'layout');
  return {};
}
