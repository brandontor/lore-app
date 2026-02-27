-- Add new character fields
ALTER TABLE public.characters
  ADD COLUMN appearance  TEXT,
  ADD COLUMN backstory   TEXT,
  ADD COLUMN portrait_url TEXT;

-- Create storage bucket for character portraits
INSERT INTO storage.buckets (id, name, public)
VALUES ('character-portraits', 'character-portraits', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Public can read character portraits"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'character-portraits');

CREATE POLICY "Authenticated users can upload character portraits"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'character-portraits');

CREATE POLICY "Portrait owners can update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'character-portraits' AND auth.uid() = owner);

CREATE POLICY "Portrait owners can delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'character-portraits' AND auth.uid() = owner);
