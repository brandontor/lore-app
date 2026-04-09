-- Migration 020: Add 'in_progress' to transcripts status constraint
-- Allows the Discord bot to mark a transcript as actively recording.
-- Run manually in the Supabase SQL editor.

ALTER TABLE public.transcripts
  DROP CONSTRAINT IF EXISTS transcripts_status_check;

ALTER TABLE public.transcripts
  ADD CONSTRAINT transcripts_status_check
    CHECK (status IN ('pending', 'processing', 'processed', 'error', 'in_progress'));
