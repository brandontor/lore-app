CREATE TABLE public.transcript_scenes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id       UUID NOT NULL REFERENCES public.transcripts(id) ON DELETE CASCADE,
  campaign_id         UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT NOT NULL,
  mood                TEXT NOT NULL CHECK (mood IN ('tense','triumphant','mysterious','dramatic','comedic','melancholic')),
  start_timestamp     TEXT,
  end_timestamp       TEXT,
  raw_speaker_lines   TEXT[] NOT NULL DEFAULT '{}',
  confidence_score    FLOAT NOT NULL DEFAULT 0.0,
  selected_for_video  BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.transcript_scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scenes_select"  ON public.transcript_scenes FOR SELECT  USING (public.user_has_campaign_access(campaign_id));
CREATE POLICY "scenes_insert"  ON public.transcript_scenes FOR INSERT  WITH CHECK (public.user_has_campaign_write(campaign_id));
CREATE POLICY "scenes_update"  ON public.transcript_scenes FOR UPDATE  USING (public.user_has_campaign_write(campaign_id));
CREATE POLICY "scenes_delete"  ON public.transcript_scenes FOR DELETE  USING (public.user_has_campaign_write(campaign_id));

CREATE INDEX idx_transcript_scenes_transcript ON public.transcript_scenes(transcript_id);
CREATE INDEX idx_transcript_scenes_campaign   ON public.transcript_scenes(campaign_id);
