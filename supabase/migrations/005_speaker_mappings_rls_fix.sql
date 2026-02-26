-- Fix RLS policies on campaign_speaker_mappings:
--   1. Replace the broad FOR ALL policy with explicit per-operation policies
--      so USING and WITH CHECK are correctly applied to mutating operations.
--   2. Keep the existing FOR SELECT policy (all campaign members can read).
--   3. Add an updated_at trigger matching the pattern used by other tables.

DROP POLICY IF EXISTS "speaker_mappings_write" ON public.campaign_speaker_mappings;

CREATE POLICY "speaker_mappings_insert" ON public.campaign_speaker_mappings
  FOR INSERT WITH CHECK (public.user_has_campaign_write(campaign_id));

CREATE POLICY "speaker_mappings_update" ON public.campaign_speaker_mappings
  FOR UPDATE
  USING (public.user_has_campaign_write(campaign_id))
  WITH CHECK (public.user_has_campaign_write(campaign_id));

CREATE POLICY "speaker_mappings_delete" ON public.campaign_speaker_mappings
  FOR DELETE USING (public.user_has_campaign_write(campaign_id));

-- updated_at trigger (reuses the set_updated_at() function from 001_initial_schema.sql)
CREATE TRIGGER trg_speaker_mappings_updated_at
  BEFORE UPDATE ON public.campaign_speaker_mappings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
