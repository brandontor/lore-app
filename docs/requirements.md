# Lore App — Requirements Tracker

## Product Vision

**Lore** is a D&D campaign management platform that helps Dungeon Masters and their players capture, organise, and relive their adventures. It converts session transcripts into AI-generated cinematic videos, turning raw session logs into shareable story moments.

**Tagline:** *From dice rolls to epic tales.*

---

## User Personas

### Dungeon Master (Campaign Owner)
The DM creates and manages campaigns. They own the campaign workspace, invite players, upload session transcripts, manage characters, and trigger video generation. They have full read/write/admin access to everything in their campaigns.

### Player (Campaign Member)
A player is invited by the DM. Depending on the permission level granted, they can view campaign content (read) or contribute content such as transcripts and character notes (write). Players cannot delete the campaign, change ownership, or manage invitations.

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Complete — implemented and working |
| 🚧 | In Progress — UI exists but backend incomplete or data is placeholder |
| ❌ | Not Started — not yet implemented |

---

## Phase 1 — Core Infrastructure ✅ Mostly Complete

Auth, Campaigns, Member Management.

### Authentication

| ID | Requirement | Status |
|----|-------------|--------|
| A-1 | Register with display name, email, password | ✅ |
| A-2 | Email confirmation via Supabase Auth | ✅ |
| A-3 | Profile row auto-created on first login | ✅ |
| A-4 | Login with email and password | ✅ |
| A-5 | Post-login redirect via `?redirect=` param | ✅ |
| A-6 | Sign out from anywhere | ✅ |
| A-7 | Protected routes redirect unauthenticated users | ✅ |
| A-8 | Auth pages redirect authenticated users away | ✅ |

### Campaigns

| ID | Requirement | Status |
|----|-------------|--------|
| C-1 | Create campaign: name, description, system, setting | ✅ |
| C-2 | Campaigns listed in sidebar and campaigns page | ✅ |
| C-3 | Campaign detail page with tabs: Overview, Transcripts, Characters, Videos, Members | ✅ |
| C-4 | Overview tab: metadata + content counts | ✅ |
| C-5 | Owner can edit campaign name, description, system, setting | ✅ |
| C-6 | Owner can delete campaign (irreversible) | ✅ |
| C-7 | Campaign status lifecycle: draft → active → completed → archived | ✅ |
| C-8 | Non-owners see 404 on owner-only pages | ✅ |

### Member Management

| ID | Requirement | Status |
|----|-------------|--------|
| M-1 | Owner invites email with read/write permission | ✅ |
| M-2 | Invitation email sent via Resend | ✅ |
| M-3 | Invitation link publicly accessible at `/invite/[token]` | ✅ |
| M-4 | Unauthenticated invitees redirected to `/login?redirect=` | ✅ |
| M-5 | Accepting invitation atomically adds member + marks accepted_at | ✅ |
| M-6 | Owner views member list with name, email, permission, join date | ✅ |
| M-7 | Owner changes member permission inline (no page reload) | ✅ |
| M-8 | Owner removes a member | ✅ |
| M-9 | Owner views and revokes pending invitations | ✅ |
| M-10 | Duplicate invitation check (same email + campaign) | ✅ |

---

## Phase 2 — Content Management 🚧 In Progress

Transcripts, Characters, Locations, World Notes.

### Transcripts

| ID | Requirement | Status |
|----|-------------|--------|
| T-1 | Global transcripts page listing all campaign transcripts | 🚧 |
| T-2 | Transcript upload: Discord export, manual text entry, or file upload | ❌ |
| T-3 | Transcript status lifecycle: pending → processing → processed → failed | ❌ |
| T-4 | Transcript detail page: full text + metadata sidebar | 🚧 |
| T-5 | Transcripts scoped to campaign and session number | ✅ |

### Characters

| ID | Requirement | Status |
|----|-------------|--------|
| Ch-1 | Character roster on Characters tab | 🚧 |
| Ch-2 | Character creation form: name, class, race, level, notes | ❌ |
| Ch-3 | Character appearance description (physical description, notable features) | ❌ |
| Ch-4 | Character portrait image upload (stored in Supabase Storage) | ❌ |
| Ch-5 | Character linked to a player (`player_id` FK to profiles) | ✅ |
| Ch-6 | Character edit and delete | ❌ |

### NPCs

| ID | Requirement | Status |
|----|-------------|--------|
| NPC-1 | NPC profiles per campaign: name, description, role | ❌ |
| NPC-2 | NPC appearance description + optional image upload | ❌ |

### Locations

| ID | Requirement | Status |
|----|-------------|--------|
| L-1 | Location profiles per campaign: name, description, type (dungeon, city, wilderness, etc.) | ❌ |
| L-2 | Location image upload (map, art, or reference image) | ❌ |
| L-3 | Locations tab on campaign detail (alongside Characters) | ❌ |

### World Notes

| ID | Requirement | Status |
|----|-------------|--------|
| W-1 | Campaign world notes: free-form lore documents (factions, history, cosmology) | ❌ |
| W-2 | World notes accessible from campaign detail and usable as generation context | ❌ |

---

## Phase 3 — Video Generation ❌ Not Started

Video wizard, AI backend, video player, session context tagging.

### Generation Wizard

| ID | Requirement | Status |
|----|-------------|--------|
| V-1 | Owner initiates generation via 3-step wizard | 🚧 (UI only) |
| V-2 | Step 1 — Select one or more processed transcripts | 🚧 (UI only) |
| V-3 | Step 2 — Choose visual style (Cinematic Fantasy, Animated Storybook, Dark & Gritty, Watercolor Illustration) | 🚧 (UI only) |
| V-4 | Step 3 — Review & Generate: preview selection then submit | 🚧 (UI only) |
| V-5 | AI generation backend: LLM + video rendering pipeline | ❌ |
| V-6 | Generation scoped to campaign owner | 🚧 |

### Context Inputs

| ID | Requirement | Status |
|----|-------------|--------|
| V-7 | Transcript scene tagging: annotate specific lines/sections as cinematic moments | ❌ |
| V-8 | Per-session mood/tone tags (e.g. "tense investigation", "triumphant boss fight") | ❌ |
| V-9 | Campaign mood board: upload reference images that define the visual aesthetic | ❌ |
| V-10 | Generation uses character portraits, NPC images, and location art as visual context | ❌ |

### Videos

| ID | Requirement | Status |
|----|-------------|--------|
| Vi-1 | Global videos page listing all campaign videos | 🚧 (mock data) |
| Vi-2 | Video grid: title, campaign, duration, created date | 🚧 (mock data) |
| Vi-3 | Video detail page: player, metadata panel, source transcripts panel | 🚧 (placeholder player) |
| Vi-4 | Video player (actual `<video>` element or embed, not placeholder) | ❌ |
| Vi-5 | Video status lifecycle: pending → processing → completed → failed | ❌ |
| Vi-6 | Visual style tag on video (matches style selected at generation) | ✅ (schema) |
| Vi-7 | Video download and share functionality | ❌ |

---

## Phase 4 — Dashboard & Polish ❌ Not Started

Real stats, activity feed, filtering, profile settings.

### Dashboard

| ID | Requirement | Status |
|----|-------------|--------|
| D-1 | Dashboard stat cards: campaigns, transcripts, videos, characters (real data) | ❌ |
| D-2 | Recent activity feed: latest actions across user's campaigns (real data) | ❌ |
| D-3 | Quick action buttons: new campaign, upload transcript | 🚧 |

### Filtering

| ID | Requirement | Status |
|----|-------------|--------|
| F-1 | Filter transcripts by campaign, date range, status | ❌ |
| F-2 | Filter videos by campaign, date range, status | ❌ |

### Profile

| ID | Requirement | Status |
|----|-------------|--------|
| P-1 | Profile settings page: edit display name, avatar | ❌ |

---

## Phase 5 — Integrations & Sharing ❌ Not Started

Discord bot, public pages, notifications.

| ID | Requirement | Status |
|----|-------------|--------|
| I-1 | Discord bot: auto-export session logs from a Discord server | ❌ |
| I-2 | Public campaign pages: read-only view without login | ❌ |
| I-3 | In-app and email notifications: invitations, completed videos | ❌ |

---

## Non-Functional Requirements

### Security & Multi-Tenancy
- All data access is enforced by Supabase Row-Level Security (RLS) at the database layer — application-layer checks alone are not sufficient.
- Campaigns are the tenant boundary. Users can only see and modify data within campaigns they own or are a member of.
- Campaign ownership is stored in `campaigns.owner_id`. The `campaign_members` table stores non-owner members only.
- Two helper functions `user_has_campaign_access(campaign_id)` and `user_has_campaign_write(campaign_id)` are reused across RLS policies to avoid duplication.
- Invitation lookup and acceptance use `SECURITY DEFINER` RPCs that bypass RLS safely — they handle their own access control internally.

### Performance
- Data fetching uses React Server Components wherever possible to avoid client-side waterfalls.
- Campaign context is persisted in a cookie to avoid re-fetching the active campaign on every navigation.
- Query functions are typed and kept thin — no business logic in query files.

### Email Reliability
- Invitation emails are sent via Resend. If the email send fails, the invitation row is still created in the database, so the DM can share the link manually or retry.
