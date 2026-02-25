'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { ActionResult, CampaignStatus } from '@lore/shared';

export async function createCampaign(formData: FormData): Promise<ActionResult<string>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const name = (formData.get('name') as string)?.trim();
  if (!name) return { error: 'Campaign name is required' };

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('campaigns')
    .insert({
      name,
      description: (formData.get('description') as string)?.trim() || null,
      system: (formData.get('system') as string)?.trim() || 'D&D 5e',
      setting: (formData.get('setting') as string)?.trim() || null,
      owner_id: user.id,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  revalidatePath('/campaigns');
  redirect(`/campaigns/${data.id}`);
}

export async function updateCampaign(
  campaignId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const name = (formData.get('name') as string)?.trim();
  if (!name) return { error: 'Campaign name is required' };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('campaigns')
    .update({
      name,
      description: (formData.get('description') as string)?.trim() || null,
      system: (formData.get('system') as string)?.trim() || 'D&D 5e',
      setting: (formData.get('setting') as string)?.trim() || null,
      status: formData.get('status') as CampaignStatus,
    })
    .eq('id', campaignId)
    .eq('owner_id', user.id);

  if (error) return { error: error.message };

  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}`);
}

export async function deleteCampaign(campaignId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('campaigns')
    .delete()
    .eq('id', campaignId)
    .eq('owner_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/campaigns');
  redirect('/campaigns');
}
