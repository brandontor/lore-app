-- Fix storage RLS policies for character-portraits bucket.
-- Replace owner-column checks (unreliable for admin-client uploads) with
-- path-based ownership. Upload path structure: {user_id}/{character_id}/portrait
-- so the first path segment is always the uploader's UID.

DROP POLICY IF EXISTS "Authenticated users can upload character portraits" ON storage.objects;
DROP POLICY IF EXISTS "Portrait owners can update" ON storage.objects;
DROP POLICY IF EXISTS "Portrait owners can delete" ON storage.objects;

CREATE POLICY "Authenticated users can upload character portraits"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'character-portraits'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Portrait owners can update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'character-portraits'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Portrait owners can delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'character-portraits'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
