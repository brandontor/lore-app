-- Migration 019: Add key_visuals and characters_present to transcript_scenes
-- These fields are populated by the extractScenes AI action and used to
-- improve video prompt quality by giving the model specific visual anchors.

ALTER TABLE public.transcript_scenes
  ADD COLUMN IF NOT EXISTS key_visuals TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS characters_present TEXT[] NOT NULL DEFAULT '{}';
