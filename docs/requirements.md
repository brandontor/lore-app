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
| ⚠️ | Risk — known technical risk; see risk notes before starting |

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

## Phase 2 — Content Management ✅ Mostly Complete

Transcripts, Characters, NPCs, Locations, World Notes.

### Transcripts

| ID | Requirement | Status |
|----|-------------|--------|
| T-1 | Global transcripts page listing all campaign transcripts | ✅ |
| T-2 | Transcript upload: manual text entry or file upload (Discord path now handled by bot — see I-1 through I-4) | ✅ |
| T-3 | Transcript status lifecycle: pending → processing → processed → failed | ❌ |
| T-4 | Transcript detail page: full text + metadata sidebar | ✅ |
| T-5 | Transcripts scoped to campaign and session number | ✅ |
| T-6 | On-demand session summary: "Generate Summary" button on transcript detail page calls OpenAI and stores result in a new `transcripts.summary` column (full raw transcript is always kept) | ✅ |
| T-7 | Summary displayed in transcript detail metadata sidebar as formatted Markdown (key events, character moments, cliffhanger); regenerable by write-access users | ✅ |
| T-8 | Summary surfaced on campaign Overview tab under recent sessions for quick catch-up by absent players | ✅ |

### Characters

| ID | Requirement | Status |
|----|-------------|--------|
| Ch-1 | Character roster on Characters tab | ✅ |
| Ch-2 | Character creation form: name, class, race, level, backstory | ✅ |
| Ch-3 | Character appearance description (physical description, notable features) | ✅ |
| Ch-4 | Character portrait image upload (stored in Supabase Storage) | ✅ |
| Ch-5 | Character linked to a player (`player_id` FK to profiles) | ✅ |
| Ch-6 | Character edit and delete | ✅ |

### NPCs

| ID | Requirement | Status |
|----|-------------|--------|
| NPC-1 | NPC profiles per campaign: name, description, role | ✅ |
| NPC-2 | NPC appearance description + optional image upload | ✅ |

### Locations

| ID | Requirement | Status |
|----|-------------|--------|
| L-1 | Location profiles per campaign: name, description, type (dungeon, city, wilderness, etc.) | ✅ |
| L-2 | Location image upload (map, art, or reference image) | ✅ |
| L-3 | Locations tab on campaign detail (alongside Characters) | ✅ |

### World Notes

| ID | Requirement | Status |
|----|-------------|--------|
| W-1 | Campaign world notes: free-form lore documents (factions, history, cosmology) | ❌ |
| W-2 | World notes accessible from campaign detail and usable as generation context | ❌ |

---

## Phase 3 — Video Generation ✅ Complete

Video wizard, AI backend, video player, session context tagging.

### Generation Wizard

| ID | Requirement | Status |
|----|-------------|--------|
| V-1 | Owner initiates generation via 4-step wizard | ✅ |
| V-2 | Step 1 — Select one or more processed transcripts | ✅ |
| V-3 | Step 3 — Choose visual style (Cinematic, Anime, Painterly, Dark Fantasy) | ✅ |
| V-4 | Step 4 — Review & Generate: preview transcripts + scenes + party characters then submit | ✅ |
| V-5 | AI generation backend: FLUX dev keyframe generation → Kling v1.6 image-to-video via fal.ai; one clip per scene; passive completion via webhooks + pg_cron fallback | ✅ |
| V-6 | Generation scoped to campaign write-access users | ✅ |

### Context Inputs

| ID | Requirement | Status |
|----|-------------|--------|
| V-7 | AI scene extraction: LLM reads transcript + campaign setting + party characters (with appearances) + NPCs + locations; outputs structured scene records stored in `transcript_scenes`: title, 4-sentence cinematic description, mood, timestamps, raw speaker lines, confidence_score, `key_visuals` (3–5 concrete visual nouns), `characters_present` (roster cross-reference) | ✅ |
| V-8 | Scene extraction triggered on-demand from the transcript detail page ("Extract Scenes" button); DM can review, deselect, or re-run extraction | ✅ |
| V-9 | Campaign mood board: upload reference images that define the visual aesthetic | ❌ |
| V-10 | Generation uses character portraits, NPC images, and location art as visual context | ❌ |
| V-11 | Video generation wizard gains a "Select Scenes" step (Step 2) between transcript selection and style selection; shows AI-extracted scene cards, DM picks which scenes to include | ✅ |
| V-12 | Scene cards display: title, mood badge (tense / triumphant / mysterious / dramatic / comedic / melancholic), timestamp range, first 2-3 dialogue lines, and confidence indicator | ✅ |
| V-13 | Video generation produces one short clip per selected scene (max 5 scenes per generation run) | ✅ |
| V-14 | DB table `transcript_scenes`: id, transcript_id, campaign_id, title, description, mood, start/end timestamps, raw speaker lines, confidence_score, selected_for_video, key_visuals, characters_present | ✅ |
| V-15 | Prompt quality: FLUX guidance_scale 7.0, num_inference_steps 35; `buildVideoPrompt` filters characters/NPCs to those present in the scene, mandates key_visual references in imagePrompt, prohibits generic tropes | ✅ |
| V-16 | Data health check in generation wizard Step 2: warns when selected scenes reference characters without appearance descriptions, listing their names so the DM can fix before generating | ✅ |

### Videos

| ID | Requirement | Status |
|----|-------------|--------|
| Vi-1 | Global videos page listing all campaign videos | ✅ |
| Vi-2 | Video grid: keyframe thumbnail, title, duration badge, style badge, download link; grouped by transcript/session | ✅ |
| Vi-3 | Video detail page: player, metadata panel, source transcript panel (linked via `video_transcripts` join table) | ✅ |
| Vi-4 | Video player: `<video>` element when file ready; keyframe image + spinner overlay while processing; auto-polls status every 5s | ✅ |
| Vi-5 | Video status lifecycle: pending → processing → completed → failed; driven by fal.ai webhooks with pg_cron fallback poll every minute | ✅ |
| Vi-6 | Visual style tag on video (matches style selected at generation) | ✅ |
| Vi-7 | Video share: `shareVideo`/`unshareVideo` server actions; public `/share/[token]` page (no auth, ISR cached); SharePanel UI on video detail with copy-link button; `is_shared` + `share_token` columns on videos | ✅ |
| Vi-8 | Session-based video organisation: /videos page and campaign Videos tab group clips by transcript with "Session N — Title · X clips" headers; ungrouped clips shown in "Other clips" section below | ✅ |
| Vi-9 | Session Reel viewer: playlist page at `/videos/reel/[transcriptId]` that autoplays clip → next clip in scene order; thumbnail strip for jumping; "Watch Reel" entry point on session headers (2+ completed clips); no stitching — clips remain individual files | ✅ |
| Vi-10 | Session Reel stitching: server-side ffmpeg concatenation into a single downloadable file with crossfade transitions | ❌ ⚠️ |

---

## Phase 4 — Dashboard & Polish 🚧 In Progress

Real stats, activity feed, filtering, profile settings.

### Dashboard

| ID | Requirement | Status |
|----|-------------|--------|
| D-1 | Dashboard stat cards: campaigns, transcripts, videos, characters (real data) | ✅ |
| D-2 | Recent activity feed: latest actions across user's campaigns (real data) | 🚧 (shows recent transcripts; full cross-content activity feed not yet built) |
| D-3 | Quick action buttons: new campaign, upload transcript | ✅ |
| D-4 | Campaign Overview "Recent Sessions" cards: session number prefix, summary excerpt (3 lines), scene count ("X scenes extracted"), link to full summary | ✅ |

### Filtering

| ID | Requirement | Status |
|----|-------------|--------|
| F-1 | Filter transcripts by campaign, date range, status | ❌ |
| F-2 | Filter videos by campaign, date range, status | ❌ |

### Profile

| ID | Requirement | Status |
|----|-------------|--------|
| P-1 | Profile settings page: edit display name, avatar | 🚧 (display name edit done; avatar upload not yet built) |

---

## Phase 5 — Integrations & Sharing 🚧 Bot Complete, Sharing Not Started

Discord bot, public pages, notifications.

### Bot

| ID | Requirement | Status |
|----|-------------|--------|
| I-1 | `/record` command: join voice channel, record all speakers | ✅ |
| I-2 | Per-utterance Whisper transcription saved as timestamped lines | ✅ |
| I-3 | `/stop` command: save full transcript to Supabase, post embed summary | ✅ |
| I-4 | Channel → campaign routing via `discord_channel_configs` table | ✅ |
| I-5 | DAVE E2EE support (`@discordjs/voice` upgraded to 0.19.2, `daveEncryption: false` removed) | ✅ |
| I-8 | `/pause` command: temporarily suspend audio capture without leaving the voice channel | ✅ |
| I-9 | `/resume` command: resume audio capture after a pause | ✅ |
| I-10 | Pause/resume tracked in-memory via `isPaused` flag on `SessionEntry`; no lines are written while paused | ✅ |
| I-11 | Campaign Overview tab Discord Bot card shows each linked channel's name and guild name (stored at `/link` time); falls back to truncated channel ID for pre-existing rows | ✅ |
| I-12 | Transcript crash resilience: periodically flush in-memory lines to a draft transcript row in Supabase so a process crash only loses the tail of the session rather than the entire transcript | ❌ |
| I-13 | Whisper hallucination filter: near-silent clips pass the 5 KB size guard but contain no real speech — Whisper echoes the prompt ("Dungeons and Dragons session transcript.") or outputs random foreign text (Cyrillic, Chinese, etc.). Fix: raise size threshold + reject transcriptions that match the prompt or consist entirely of non-Latin characters | ❌ |
| I-14 | Whisper structured-text hallucination: on ambiguous audio Whisper occasionally outputs prompt/template fragments (e.g. `context: ###`). Fix: extend hallucination filter to reject lines matching known artifact patterns | ❌ |
| I-15 | Rapid clip queue on noisy audio: when multiple speakers talk in quick succession the `activeStreams` lock releases immediately after each clip closes, allowing a burst of short near-silent clips to queue up and all hit Whisper. Fix: add a per-user cooldown after the stream closes (e.g. 1–2 s) to suppress the burst | ❌ |
| I-16 | Sentence splitting across clips: the 2 s silence window (`end: { behavior: 1, duration: 2000 }`) cuts clips mid-sentence on natural speech pauses, producing two consecutive lines for what was one utterance. Consider increasing the silence window (e.g. 3–4 s) or merging consecutive lines from the same speaker within a short time window | ❌ |

### Public Pages & Notifications

| ID | Requirement | Status |
|----|-------------|--------|
| I-6 | Public campaign pages: read-only view without login | ❌ |
| I-7 | In-app and email notifications: invitations, completed videos | ❌ |

---

## Non-Functional Requirements

### Security & Multi-Tenancy
- All data access is enforced by Supabase Row-Level Security (RLS) at the database layer — application-layer checks alone are not sufficient.
- Campaigns are the tenant boundary. Users can only see and modify data within campaigns they own or are a member of.
- Campaign ownership is stored in `campaigns.owner_id`. The `campaign_members` table stores non-owner members only.
- Two helper functions `user_has_campaign_access(campaign_id)` and `user_has_campaign_write(campaign_id)` are reused across RLS policies to avoid duplication.
- Invitation lookup and acceptance use `SECURITY DEFINER` RPCs that bypass RLS safely — they handle their own access control internally.
- `storage_path` values from the DB are validated via `isSafeStorageUrl()` before use as `href`/`src` to prevent XSS via `javascript:` URLs.
- Transcript detail page guards campaign access: if `getCampaignById` returns null (user not a member), the route returns 404 rather than exposing transcript content.

### Performance
- Data fetching uses React Server Components wherever possible to avoid client-side waterfalls.
- Campaign context is persisted in a cookie to avoid re-fetching the active campaign on every navigation.
- Query functions are typed and kept thin — no business logic in query files.

### Email Reliability
- Invitation emails are sent via Resend. If the email send fails, the invitation row is still created in the database, so the DM can share the link manually or retry.

---

## Next Steps — Prioritised Backlog

Items below are ordered by value-to-effort ratio.

---

### ⚠️ Risk Register

Review the relevant risk entry before starting any item marked ⚠️.

| Risk ID | Affects | Risk | Mitigation |
|---------|---------|------|-----------|
| R-1 | Vi-10 Stitching | ffmpeg-wasm loads a ~30MB WASM binary from unpkg CDN at stitch time — CDN outage silently fails; consider fal.ai concat API or Railway ffmpeg instead | Fail gracefully to `status = 'error'`; re-evaluate approach when Vi-10 is prioritised |
| R-2 | Vi-10 Stitching | Cron fires every minute — concurrent Vercel invocations could double-stitch the same collection | Guard with atomic `UPDATE … WHERE status = 'pending'`; only the first writer wins |
| R-3 | Vi-10 Stitching | Stitching 5 × 10s clips takes ~30–90s — requires Vercel Pro and `maxDuration = 800` on the stitch route | Already on Vercel Pro; revisit when Vi-10 is scheduled |
| R-4 | I-5 DAVE E2EE | Discord enforcing DAVE for all voice channels from March 2026; `daveEncryption: false` may be rejected | Watch for `@discordjs/voice` patch (likely 0.19.1+), bump version, remove the workaround |

---

### High Priority

| ID | Item | Rationale |
|----|------|-----------|
| V-10 | Character portraits, NPC images, and location art as image conditioning inputs in video prompts | Asset library exists; passing portraits as reference to FLUX is the remaining quality gap after Phase 2 enrichment |
| W-1 / W-2 | World Notes: free-form lore documents (factions, history, cosmology) per campaign | Completes the world-building content layer; feeds into extractScenes context |
| P-1b | Profile avatar upload (Supabase Storage, same pattern as character portraits) | P-1 is 🚧; storage pattern is proven — straightforward to complete |

### Medium Priority

| ID | Item | Rationale |
|----|------|-----------|
| D-2b | Activity feed: show recent transcripts, videos, and NPCs/locations across campaigns | D-2 is 🚧; expand from transcripts-only to full cross-content feed |
| F-1 / F-2 | Filter transcripts and videos by campaign, date range, status | UX quality of life once content volume grows |
| T-3 | Transcript status lifecycle (pending → processing → processed → failed) | Currently untracked; needed for bot-uploaded transcripts that may fail processing |

### Lower Priority / Future

| ID | Item | Rationale |
|----|------|-----------|
| Vi-10 ⚠️ | Session Reel stitching: server-side concat of all session clips into a single downloadable file with crossfade transitions. Approach TBD — ffmpeg-wasm (CDN risk), Railway ffmpeg (invasive), or a managed video API. See R-1 through R-3. | Deferred in favour of browser-side playlist (Vi-9); revisit once Vi-9 is live and validated |
| V-9 | Campaign mood board: upload reference images to define visual aesthetic | Powerful creative control but significant UX work; defer until core pipeline proven |
| I-12 | Transcript crash resilience (bot): periodically flush in-memory lines to a draft transcript row so a process crash only loses the tail | In-memory transcript lost on Railway restart mid-session |
| I-13 | Whisper hallucination filter (bot): near-silent clips cause Whisper to echo the prompt or output foreign text; raise size threshold + filter known patterns | Noisy audio produces garbage transcript lines |
| I-14 | Whisper structured-text hallucination (bot): ambiguous audio produces template fragments like `context: ###`; extend filter to cover these patterns | Variant of I-13 with different artifact shape |
| I-15 | Rapid clip burst on noisy audio (bot): add per-user cooldown after stream closes to suppress the burst of short near-silent clips that queue up | `activeStreams` lock releases immediately after each clip |
| I-16 | Sentence splitting across clips (bot): 2s silence window cuts clips mid-sentence; increase window or merge consecutive lines from the same speaker | Speech pauses produce split lines |
| I-17 | Out-of-order transcript lines (bot): lines appended after Whisper returns, not when speech started — long clips land after short clips even if they started first; timestamps reflect Whisper completion not speech start. Fix: capture clip start time before pipeline, use it for the timestamp, insert in chronological order | Transcript ordering is wrong for long clips |
| I-6 | Public campaign pages (read-only, no login) | Good for sharing but requires auth-bypass care; lower urgency while app is invite-only |
| I-7 | In-app and email notifications (invitations, completed videos) | Nice polish; Resend already integrated so email side is straightforward |
