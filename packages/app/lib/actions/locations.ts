'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { ActionResult } from '@lore/shared';

export async function createLocation(
  campaignId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const name = (formData.get('name') as string)?.trim();
  if (!name) return { error: 'Location name is required' };

  const { data: hasWrite } = await supabase.rpc('user_has_campaign_write', { p_campaign_id: campaignId });
  if (!hasWrite) return { error: 'Access denied' };

  const { error } = await createAdminClient()
    .from('locations')
    .insert({
      campaign_id: campaignId,
      name,
      type: (formData.get('type') as string)?.trim() || null,
      description: (formData.get('description') as string)?.trim() || null,
    });

  if (error) return { error: error.message };

  revalidatePath(`/campaigns/${campaignId}`);
  return {};
}

export async function updateLocation(
  locationId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const name = (formData.get('name') as string)?.trim();
  if (!name) return { error: 'Location name is required' };

  const adminClient = createAdminClient();

  const { data: location } = await adminClient
    .from('locations')
    .select('campaign_id')
    .eq('id', locationId)
    .single();

  if (!location) return { error: 'Location not found' };

  const { data: hasWrite } = await supabase.rpc('user_has_campaign_write', { p_campaign_id: location.campaign_id });
  if (!hasWrite) return { error: 'Access denied' };

  const { error } = await adminClient
    .from('locations')
    .update({
      name,
      type: (formData.get('type') as string)?.trim() || null,
      description: (formData.get('description') as string)?.trim() || null,
    })
    .eq('id', locationId);

  if (error) return { error: error.message };

  revalidatePath(`/campaigns/${location.campaign_id}`);
  return {};
}

export async function updateLocationImage(
  locationId: string,
  imageUrl: string
): Promise<ActionResult> {
  const allowedPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/location-images/`;
  if (!imageUrl.startsWith(allowedPrefix)) {
    return { error: 'Invalid image URL' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const adminClient = createAdminClient();

  const { data: location } = await adminClient
    .from('locations')
    .select('campaign_id')
    .eq('id', locationId)
    .single();

  if (!location) return { error: 'Location not found' };

  const { data: hasWrite } = await supabase.rpc('user_has_campaign_write', { p_campaign_id: location.campaign_id });
  if (!hasWrite) return { error: 'Access denied' };

  const { error } = await adminClient
    .from('locations')
    .update({ image_url: imageUrl })
    .eq('id', locationId);

  if (error) return { error: error.message };

  revalidatePath(`/campaigns/${location.campaign_id}`);
  return {};
}

export async function deleteLocation(locationId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const adminClient = createAdminClient();

  const { data: location } = await adminClient
    .from('locations')
    .select('campaign_id')
    .eq('id', locationId)
    .single();

  if (!location) return { error: 'Location not found' };

  const { data: hasWrite } = await supabase.rpc('user_has_campaign_write', { p_campaign_id: location.campaign_id });
  if (!hasWrite) return { error: 'Access denied' };

  const { error } = await adminClient
    .from('locations')
    .delete()
    .eq('id', locationId);

  if (error) return { error: error.message };

  revalidatePath(`/campaigns/${location.campaign_id}`);
  return {};
}
