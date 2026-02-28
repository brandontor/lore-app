-- Migration 010: Fix campaign-videos storage RLS policies
-- Drops the overly permissive 009 policies and replaces them with
-- campaign-scoped ownership checks. Upload path must be {campaign_id}/{video_id}.mp4
-- so the first folder segment identifies the campaign.

-- Drop old permissive policies from migration 009
DROP POLICY IF EXISTS "Public video read" ON storage.objects;
DROP POLICY IF EXISTS "Write access video upload" ON storage.objects;

-- Re-add public read (unchanged)
CREATE POLICY "Public video read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'campaign-videos');

-- INSERT: user must have write access to the campaign in the path prefix
CREATE POLICY "Campaign write video upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'campaign-videos'
    AND auth.uid() IS NOT NULL
    AND user_has_campaign_write((storage.foldername(name))[1]::uuid)
  );

-- UPDATE: needed for upsert; same campaign write requirement
CREATE POLICY "Campaign write video update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'campaign-videos'
    AND user_has_campaign_write((storage.foldername(name))[1]::uuid)
  );
