-- Add human-readable guild and channel names to discord_channel_configs.
-- Populated by the bot at /link time. Existing rows will have NULL values;
-- the UI falls back gracefully to the raw channel_id.
ALTER TABLE discord_channel_configs
  ADD COLUMN IF NOT EXISTS guild_id     TEXT,
  ADD COLUMN IF NOT EXISTS guild_name   TEXT,
  ADD COLUMN IF NOT EXISTS channel_name TEXT;
