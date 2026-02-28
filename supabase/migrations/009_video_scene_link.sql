-- Migration 009: Add fal_request_id and scene_id to videos; create campaign-videos storage bucket

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS fal_request_id TEXT,
  ADD COLUMN IF NOT EXISTS scene_id UUID REFERENCES public.transcript_scenes(id) ON DELETE SET NULL;

-- Create campaign-videos storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-videos', 'campaign-videos', true)
ON CONFLICT DO NOTHING;

-- RLS for campaign-videos storage
CREATE POLICY "Public video read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'campaign-videos');

CREATE POLICY "Write access video upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'campaign-videos' AND auth.role() = 'authenticated');
