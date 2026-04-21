-- Migration 021: Video quality improvements
-- Adds location_name to transcript_scenes for better spatial context in video prompts
-- Updates fal_model default to Kling v3.0

-- Add location_name to transcript_scenes
ALTER TABLE transcript_scenes
  ADD COLUMN IF NOT EXISTS location_name TEXT;

-- Update default fal_model for new video rows to Kling v3.0
ALTER TABLE videos
  ALTER COLUMN fal_model SET DEFAULT 'fal-ai/kling-video/v3/pro/image-to-video';
