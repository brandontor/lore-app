'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { ActionResult } from '@lore/shared';

async function verifyWriteAccess(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  campaignId: string
): Promise<boolean> {
  const [{ data: owned }, { data: member }] = await Promise.all([
    adminClient.from('campaigns').select('id').eq('id', campaignId).eq('owner_id', userId).single(),
    adminClient.from('campaign_members').select('permission').eq('campaign_id', campaignId).eq('user_id', userId).single(),
  ]);
  return !!owned || member?.permission === 'write';
}

function parseLevel(raw: string | null): number {
  if (!raw) return 1;
  const n = parseInt(raw, 10);
  if (isNaN(n) || n < 1) return 1;
  if (n > 20) return 20;
  return n;
}

export async function createCharacter(
  campaignId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const name = (formData.get('name') as string)?.trim();
  if (!name) return { error: 'Character name is required' };

  const adminClient = createAdminClient();
  const hasWrite = await verifyWriteAccess(adminClient, user.id, campaignId);
  if (!hasWrite) return { error: 'Access denied' };

  const { error } = await adminClient
    .from('characters')
    .insert({
      campaign_id: campaignId,
      name,
      class: (formData.get('class') as string)?.trim() || null,
      race: (formData.get('race') as string)?.trim() || null,
      level: parseLevel(formData.get('level') as string),
      appearance: (formData.get('appearance') as string)?.trim() || null,
      backstory: (formData.get('backstory') as string)?.trim() || null,
    });

  if (error) return { error: error.message };

  revalidatePath(`/campaigns/${campaignId}`);
  return {};
}

export async function updateCharacter(
  characterId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const name = (formData.get('name') as string)?.trim();
  if (!name) return { error: 'Character name is required' };

  const adminClient = createAdminClient();

  const { data: character } = await adminClient
    .from('characters')
    .select('campaign_id')
    .eq('id', characterId)
    .single();

  if (!character) return { error: 'Character not found' };

  const hasWrite = await verifyWriteAccess(adminClient, user.id, character.campaign_id);
  if (!hasWrite) return { error: 'Access denied' };

  const { error } = await adminClient
    .from('characters')
    .update({
      name,
      class: (formData.get('class') as string)?.trim() || null,
      race: (formData.get('race') as string)?.trim() || null,
      level: parseLevel(formData.get('level') as string),
      appearance: (formData.get('appearance') as string)?.trim() || null,
      backstory: (formData.get('backstory') as string)?.trim() || null,
    })
    .eq('id', characterId);

  if (error) return { error: error.message };

  revalidatePath(`/campaigns/${character.campaign_id}`);
  return {};
}

export async function updateCharacterPortrait(
  characterId: string,
  portraitUrl: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const adminClient = createAdminClient();

  const { data: character } = await adminClient
    .from('characters')
    .select('campaign_id')
    .eq('id', characterId)
    .single();

  if (!character) return { error: 'Character not found' };

  const hasWrite = await verifyWriteAccess(adminClient, user.id, character.campaign_id);
  if (!hasWrite) return { error: 'Access denied' };

  const { error } = await adminClient
    .from('characters')
    .update({ portrait_url: portraitUrl })
    .eq('id', characterId);

  if (error) return { error: error.message };

  revalidatePath(`/campaigns/${character.campaign_id}`);
  return {};
}

export async function deleteCharacter(characterId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const adminClient = createAdminClient();

  const { data: character } = await adminClient
    .from('characters')
    .select('campaign_id')
    .eq('id', characterId)
    .single();

  if (!character) return { error: 'Character not found' };

  const hasWrite = await verifyWriteAccess(adminClient, user.id, character.campaign_id);
  if (!hasWrite) return { error: 'Access denied' };

  const { error } = await adminClient
    .from('characters')
    .delete()
    .eq('id', characterId);

  if (error) return { error: error.message };

  revalidatePath(`/campaigns/${character.campaign_id}`);
  return {};
}
