-- Migration 011: Fix fal_model column default
-- Migration 010 set the default to the text-to-video model path for backward
-- compatibility with pre-existing rows. Now that all new inserts explicitly
-- provide fal_model, update the default to reflect the current pipeline
-- (image-to-video). This only affects hypothetical manual inserts; the
-- application code always sets fal_model explicitly.

ALTER TABLE videos
  ALTER COLUMN fal_model SET DEFAULT 'fal-ai/kling-video/v1.6/standard/image-to-video';
