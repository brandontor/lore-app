-- =============================================================
-- LORE APP — Initial Schema
-- Run this entire file in the Supabase SQL Editor.
-- =============================================================

-- ---------------------------------------------------------------
-- HELPER: updated_at trigger function
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------
-- TABLE: profiles
-- One row per auth.users. Created automatically by trigger.
-- ---------------------------------------------------------------
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL DEFAULT '',
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------
-- TABLE: campaigns
-- The tenant entity. owner_id is the Dungeon Master.
-- ---------------------------------------------------------------
CREATE TABLE public.campaigns (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,
  system       TEXT NOT NULL DEFAULT 'D&D 5e',
  setting      TEXT,
  status       TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  owner_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------
-- TABLE: campaign_members
-- Per-user access grants. Owner is NOT stored here —
-- owner access is derived from campaigns.owner_id.
-- ---------------------------------------------------------------
CREATE TABLE public.campaign_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission   TEXT NOT NULL CHECK (permission IN ('read', 'write')),
  invited_by   UUID NOT NULL REFERENCES public.profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, user_id)
);

-- ---------------------------------------------------------------
-- TABLE: campaign_invitations
-- Pending email invites. token is a 32-byte hex string used
-- in the /invite/[token] URL.
-- ---------------------------------------------------------------
CREATE TABLE public.campaign_invitations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  invited_by   UUID NOT NULL REFERENCES public.profiles(id),
  email        TEXT NOT NULL,
  permission   TEXT NOT NULL CHECK (permission IN ('read', 'write')),
  token        TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- TABLE: transcripts
-- Campaign-scoped session transcripts.
-- ---------------------------------------------------------------
CREATE TABLE public.transcripts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  session_number   INTEGER,
  content          TEXT NOT NULL DEFAULT '',
  source           TEXT NOT NULL DEFAULT 'manual'
                     CHECK (source IN ('discord', 'manual', 'upload')),
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'processing', 'processed', 'error')),
  duration_minutes INTEGER,
  session_date     DATE,
  uploaded_by      UUID NOT NULL REFERENCES public.profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_transcripts_updated_at
  BEFORE UPDATE ON public.transcripts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------
-- TABLE: characters
-- Campaign-scoped player characters.
-- ---------------------------------------------------------------
CREATE TABLE public.characters (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  class        TEXT,
  race         TEXT,
  level        INTEGER NOT NULL DEFAULT 1,
  player_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_characters_updated_at
  BEFORE UPDATE ON public.characters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------
-- TABLE: videos
-- Campaign-scoped AI-generated videos.
-- ---------------------------------------------------------------
CREATE TABLE public.videos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  style            TEXT NOT NULL DEFAULT 'cinematic'
                     CHECK (style IN ('cinematic', 'anime', 'painterly', 'dark-fantasy')),
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  storage_path     TEXT,
  duration_seconds INTEGER,
  requested_by     UUID NOT NULL REFERENCES public.profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Junction: which transcripts were used for a video
CREATE TABLE public.video_transcripts (
  video_id      UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  transcript_id UUID NOT NULL REFERENCES public.transcripts(id) ON DELETE CASCADE,
  PRIMARY KEY (video_id, transcript_id)
);

-- =============================================================
-- RLS HELPER FUNCTIONS
-- =============================================================

-- Returns true if calling user is the campaign owner OR any member
CREATE OR REPLACE FUNCTION public.user_has_campaign_access(p_campaign_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    EXISTS (SELECT 1 FROM campaigns WHERE id = p_campaign_id AND owner_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM campaign_members WHERE campaign_id = p_campaign_id AND user_id = auth.uid());
$$;

-- Returns true if calling user is owner OR has write permission
CREATE OR REPLACE FUNCTION public.user_has_campaign_write(p_campaign_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    EXISTS (SELECT 1 FROM campaigns WHERE id = p_campaign_id AND owner_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM campaign_members
      WHERE campaign_id = p_campaign_id AND user_id = auth.uid() AND permission = 'write'
    );
$$;

-- =============================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================

-- ---------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

-- Also see profiles of campaign peers (for member lists)
CREATE POLICY "profiles_select_campaign_peers"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_members cm_self
      JOIN public.campaign_members cm_peer ON cm_self.campaign_id = cm_peer.campaign_id
      WHERE cm_self.user_id = auth.uid() AND cm_peer.user_id = profiles.id
    )
    OR EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.campaign_members cm ON cm.campaign_id = c.id
      WHERE c.owner_id = auth.uid() AND cm.user_id = profiles.id
    )
    OR EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.campaign_members cm ON cm.campaign_id = c.id
      WHERE cm.user_id = auth.uid() AND c.owner_id = profiles.id
    )
  );

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---------------------------------------------------------------
-- campaigns
-- ---------------------------------------------------------------
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_select"
  ON public.campaigns FOR SELECT
  USING (public.user_has_campaign_access(id));

CREATE POLICY "campaigns_insert"
  ON public.campaigns FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "campaigns_update"
  ON public.campaigns FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "campaigns_delete"
  ON public.campaigns FOR DELETE
  USING (owner_id = auth.uid());

-- ---------------------------------------------------------------
-- campaign_members
-- ---------------------------------------------------------------
ALTER TABLE public.campaign_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaign_members_select"
  ON public.campaign_members FOR SELECT
  USING (public.user_has_campaign_access(campaign_id));

CREATE POLICY "campaign_members_insert"
  ON public.campaign_members FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND owner_id = auth.uid())
  );

CREATE POLICY "campaign_members_update"
  ON public.campaign_members FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND owner_id = auth.uid())
  );

-- Owner can remove anyone; members can remove themselves
CREATE POLICY "campaign_members_delete"
  ON public.campaign_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND owner_id = auth.uid())
  );

-- ---------------------------------------------------------------
-- campaign_invitations
-- ---------------------------------------------------------------
ALTER TABLE public.campaign_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invitations_select_owner"
  ON public.campaign_invitations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND owner_id = auth.uid())
  );

CREATE POLICY "invitations_insert"
  ON public.campaign_invitations FOR INSERT
  WITH CHECK (
    invited_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND owner_id = auth.uid())
  );

CREATE POLICY "invitations_delete"
  ON public.campaign_invitations FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND owner_id = auth.uid())
  );

-- ---------------------------------------------------------------
-- transcripts
-- ---------------------------------------------------------------
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transcripts_select"
  ON public.transcripts FOR SELECT
  USING (public.user_has_campaign_access(campaign_id));

CREATE POLICY "transcripts_insert"
  ON public.transcripts FOR INSERT
  WITH CHECK (public.user_has_campaign_write(campaign_id) AND uploaded_by = auth.uid());

CREATE POLICY "transcripts_update"
  ON public.transcripts FOR UPDATE
  USING (public.user_has_campaign_write(campaign_id));

CREATE POLICY "transcripts_delete"
  ON public.transcripts FOR DELETE
  USING (public.user_has_campaign_write(campaign_id));

-- ---------------------------------------------------------------
-- characters
-- ---------------------------------------------------------------
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "characters_select"
  ON public.characters FOR SELECT
  USING (public.user_has_campaign_access(campaign_id));

CREATE POLICY "characters_insert"
  ON public.characters FOR INSERT
  WITH CHECK (public.user_has_campaign_write(campaign_id));

CREATE POLICY "characters_update"
  ON public.characters FOR UPDATE
  USING (public.user_has_campaign_write(campaign_id));

CREATE POLICY "characters_delete"
  ON public.characters FOR DELETE
  USING (public.user_has_campaign_write(campaign_id));

-- ---------------------------------------------------------------
-- videos
-- ---------------------------------------------------------------
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "videos_select"
  ON public.videos FOR SELECT
  USING (public.user_has_campaign_access(campaign_id));

CREATE POLICY "videos_insert"
  ON public.videos FOR INSERT
  WITH CHECK (public.user_has_campaign_write(campaign_id) AND requested_by = auth.uid());

CREATE POLICY "videos_update"
  ON public.videos FOR UPDATE
  USING (public.user_has_campaign_write(campaign_id));

CREATE POLICY "videos_delete"
  ON public.videos FOR DELETE
  USING (public.user_has_campaign_write(campaign_id));

-- ---------------------------------------------------------------
-- video_transcripts (inherits access from videos)
-- ---------------------------------------------------------------
ALTER TABLE public.video_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "video_transcripts_select"
  ON public.video_transcripts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_id AND public.user_has_campaign_access(v.campaign_id)
    )
  );

CREATE POLICY "video_transcripts_insert"
  ON public.video_transcripts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_id AND public.user_has_campaign_write(v.campaign_id)
    )
  );

CREATE POLICY "video_transcripts_delete"
  ON public.video_transcripts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_id AND public.user_has_campaign_write(v.campaign_id)
    )
  );

-- =============================================================
-- SECURITY DEFINER RPCs (for invitation flow)
-- =============================================================

-- Token lookup — bypasses RLS so unauthenticated/mismatched users
-- can view invite details before signing in.
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token TEXT)
RETURNS TABLE (
  id           UUID,
  campaign_id  UUID,
  campaign_name TEXT,
  email        TEXT,
  permission   TEXT,
  expires_at   TIMESTAMPTZ,
  accepted_at  TIMESTAMPTZ
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    i.id,
    i.campaign_id,
    c.name AS campaign_name,
    i.email,
    i.permission,
    i.expires_at,
    i.accepted_at
  FROM public.campaign_invitations i
  JOIN public.campaigns c ON c.id = i.campaign_id
  WHERE i.token = p_token
  LIMIT 1;
$$;

-- Atomically accepts an invitation: creates the member row and
-- marks accepted_at in a single transaction to prevent double-accept.
CREATE OR REPLACE FUNCTION public.accept_campaign_invitation(
  p_token   TEXT,
  p_user_id UUID
)
RETURNS UUID  -- returns the campaign_id for redirect
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inv RECORD;
BEGIN
  SELECT * INTO v_inv
  FROM public.campaign_invitations
  WHERE token = p_token
    AND accepted_at IS NULL
    AND expires_at > NOW()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found, expired, or already accepted';
  END IF;

  INSERT INTO public.campaign_members (campaign_id, user_id, permission, invited_by)
  VALUES (v_inv.campaign_id, p_user_id, v_inv.permission, v_inv.invited_by)
  ON CONFLICT (campaign_id, user_id) DO UPDATE
    SET permission = EXCLUDED.permission;

  UPDATE public.campaign_invitations
  SET accepted_at = NOW()
  WHERE id = v_inv.id;

  RETURN v_inv.campaign_id;
END;
$$;
