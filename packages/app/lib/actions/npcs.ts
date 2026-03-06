'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { ActionResult } from '@lore/shared';

export async function createNpc(
  campaignId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const name = (formData.get('name') as string)?.trim();
  if (!name) return { error: 'NPC name is required' };

  const { data: hasWrite } = await supabase.rpc('user_has_campaign_write', { p_campaign_id: campaignId });
  if (!hasWrite) return { error: 'Access denied' };

  const { error } = await createAdminClient()
    .from('npcs')
    .insert({
      campaign_id: campaignId,
      name,
      role: (formData.get('role') as string)?.trim() || null,
      description: (formData.get('description') as string)?.trim() || null,
      appearance: (formData.get('appearance') as string)?.trim() || null,
    });

  if (error) return { error: error.message };

  revalidatePath(`/campaigns/${campaignId}`);
  return {};
}

export async function updateNpc(
  npcId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const name = (formData.get('name') as string)?.trim();
  if (!name) return { error: 'NPC name is required' };

  const adminClient = createAdminClient();

  const { data: npc } = await adminClient
    .from('npcs')
    .select('campaign_id')
    .eq('id', npcId)
    .single();

  if (!npc) return { error: 'NPC not found' };

  const { data: hasWrite } = await supabase.rpc('user_has_campaign_write', { p_campaign_id: npc.campaign_id });
  if (!hasWrite) return { error: 'Access denied' };

  const { error } = await adminClient
    .from('npcs')
    .update({
      name,
      role: (formData.get('role') as string)?.trim() || null,
      description: (formData.get('description') as string)?.trim() || null,
      appearance: (formData.get('appearance') as string)?.trim() || null,
    })
    .eq('id', npcId);

  if (error) return { error: error.message };

  revalidatePath(`/campaigns/${npc.campaign_id}`);
  return {};
}

export async function updateNpcImage(
  npcId: string,
  imageUrl: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const allowedPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/npc-portraits/`;
  if (!imageUrl.startsWith(allowedPrefix)) {
    return { error: 'Invalid image URL' };
  }

  const adminClient = createAdminClient();

  const { data: npc } = await adminClient
    .from('npcs')
    .select('campaign_id')
    .eq('id', npcId)
    .single();

  if (!npc) return { error: 'NPC not found' };

  const { data: hasWrite } = await supabase.rpc('user_has_campaign_write', { p_campaign_id: npc.campaign_id });
  if (!hasWrite) return { error: 'Access denied' };

  const { error } = await adminClient
    .from('npcs')
    .update({ image_url: imageUrl })
    .eq('id', npcId);

  if (error) return { error: error.message };

  revalidatePath(`/campaigns/${npc.campaign_id}`);
  return {};
}

export async function deleteNpc(npcId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const adminClient = createAdminClient();

  const { data: npc } = await adminClient
    .from('npcs')
    .select('campaign_id')
    .eq('id', npcId)
    .single();

  if (!npc) return { error: 'NPC not found' };

  const { data: hasWrite } = await supabase.rpc('user_has_campaign_write', { p_campaign_id: npc.campaign_id });
  if (!hasWrite) return { error: 'Access denied' };

  const { error } = await adminClient
    .from('npcs')
    .delete()
    .eq('id', npcId);

  if (error) return { error: error.message };

  revalidatePath(`/campaigns/${npc.campaign_id}`);
  return {};
}
