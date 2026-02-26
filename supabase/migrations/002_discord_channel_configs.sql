-- Migration 002: Discord channel → campaign mapping
-- One Discord channel maps to exactly one campaign.
-- Discord channel IDs are globally unique, so channel_id is sufficient as PK.

CREATE TABLE discord_channel_configs (
  channel_id   TEXT PRIMARY KEY,
  campaign_id  UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  linked_by    UUID NOT NULL REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE discord_channel_configs ENABLE ROW LEVEL SECURITY;

-- Campaign members can read their channel configs (bot reads this to route transcripts)
CREATE POLICY "Campaign members can read channel configs"
  ON discord_channel_configs FOR SELECT
  USING (user_has_campaign_access(campaign_id));

-- Only campaign owners can link/unlink channels
CREATE POLICY "Campaign owners can manage channel configs"
  ON discord_channel_configs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM campaigns WHERE id = campaign_id AND owner_id = auth.uid())
  );
