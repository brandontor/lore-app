-- Add public share link support to videos
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_shared   BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS videos_share_token_idx
  ON public.videos (share_token)
  WHERE share_token IS NOT NULL;

-- Allow anyone (including unauthenticated) to SELECT a video that has been shared.
-- Supabase evaluates permissive policies with OR semantics, so this adds to the
-- existing campaign-membership policy rather than replacing it.
CREATE POLICY "videos_select_shared"
  ON public.videos FOR SELECT
  USING (is_shared = TRUE AND share_token IS NOT NULL);
