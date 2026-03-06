ALTER TABLE public.locations
  ADD CONSTRAINT locations_type_check
  CHECK (type IS NULL OR type IN ('dungeon', 'city', 'wilderness', 'temple', 'inn', 'forest', 'other'));
