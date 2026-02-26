-- Campaign-level speaker → character mappings
-- Maps Discord usernames (parsed from transcript lines) to campaign characters
CREATE TABLE public.campaign_speaker_mappings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  speaker_name TEXT NOT NULL,
  character_id UUID REFERENCES public.characters(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, speaker_name)
);

ALTER TABLE public.campaign_speaker_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "speaker_mappings_select" ON public.campaign_speaker_mappings
  FOR SELECT USING (public.user_has_campaign_access(campaign_id));

CREATE POLICY "speaker_mappings_write" ON public.campaign_speaker_mappings
  FOR ALL USING (public.user_has_campaign_write(campaign_id));
