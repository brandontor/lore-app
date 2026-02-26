-- =============================================================
-- LORE APP — Migration 005: Add summary column to transcripts
-- Run this in the Supabase SQL Editor.
-- =============================================================

ALTER TABLE public.transcripts
  ADD COLUMN IF NOT EXISTS summary TEXT;
