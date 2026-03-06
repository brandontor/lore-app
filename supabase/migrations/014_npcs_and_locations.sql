-- NPCs table
CREATE TABLE public.npcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  description TEXT,
  appearance TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_npcs_updated_at
  BEFORE UPDATE ON public.npcs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.npcs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "npcs_select" ON public.npcs
  FOR SELECT USING (user_has_campaign_access(campaign_id));

CREATE POLICY "npcs_insert" ON public.npcs
  FOR INSERT WITH CHECK (user_has_campaign_write(campaign_id));

CREATE POLICY "npcs_update" ON public.npcs
  FOR UPDATE USING (user_has_campaign_write(campaign_id));

CREATE POLICY "npcs_delete" ON public.npcs
  FOR DELETE USING (user_has_campaign_write(campaign_id));

CREATE INDEX idx_npcs_campaign_id ON public.npcs(campaign_id);

-- Locations table
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "locations_select" ON public.locations
  FOR SELECT USING (user_has_campaign_access(campaign_id));

CREATE POLICY "locations_insert" ON public.locations
  FOR INSERT WITH CHECK (user_has_campaign_write(campaign_id));

CREATE POLICY "locations_update" ON public.locations
  FOR UPDATE USING (user_has_campaign_write(campaign_id));

CREATE POLICY "locations_delete" ON public.locations
  FOR DELETE USING (user_has_campaign_write(campaign_id));

CREATE INDEX idx_locations_campaign_id ON public.locations(campaign_id);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('npc-portraits', 'npc-portraits', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('location-images', 'location-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: npc-portraits
CREATE POLICY "npc_portraits_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'npc-portraits');

CREATE POLICY "npc_portraits_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'npc-portraits'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "npc_portraits_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'npc-portraits'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "npc_portraits_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'npc-portraits'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage RLS: location-images
CREATE POLICY "location_images_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'location-images');

CREATE POLICY "location_images_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'location-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "location_images_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'location-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "location_images_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'location-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
