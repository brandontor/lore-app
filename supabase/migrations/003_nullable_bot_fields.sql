-- Migration 003: Make uploaded_by nullable to allow bot-created transcripts
-- and linked_by nullable in discord_channel_configs.
-- Run manually in the Supabase SQL editor.

ALTER TABLE public.transcripts ALTER COLUMN uploaded_by DROP NOT NULL;
ALTER TABLE public.discord_channel_configs ALTER COLUMN linked_by DROP NOT NULL;
