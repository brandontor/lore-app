-- Migration 017: Add user-controllable video generation parameters
-- camera_preset: named camera movement or 'auto'
-- motion_intensity: cfg_scale value (0.3–0.8)
-- clip_duration: video length in seconds (5 or 10)

ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS camera_preset  TEXT    DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS motion_intensity REAL  DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS clip_duration   INTEGER DEFAULT 5;
