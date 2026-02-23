# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

No test suite is configured.

## Architecture

D&D campaign management app. Stack: Next.js 16 App Router, React 19, Supabase (Auth + DB), Tailwind CSS v4, TypeScript. Package manager: npm.

### Route Structure

Two route groups under `app/`:
- `(app)/` — Protected routes (dashboard, campaigns, transcripts, videos). Wrapped by `CampaignProvider` in `(app)/layout.tsx`, which force-dynamically fetches user + campaign data server-side.
- `(auth)/` — Public routes (login, register).

Special routes: `/auth/callback` (OAuth), `/invite/[token]` (campaign invitations — works without auth via SECURITY DEFINER RPC).

`middleware.ts` protects `(app)` routes, redirecting unauthenticated users to `/login?redirect=<path>`.

### Multi-Tenancy

Campaigns are the tenant unit. The campaign owner (`campaigns.owner_id`) is the DM. Non-owner members are stored in `campaign_members` with `read | write` permission. Supabase RLS enforces isolation via two helper SQL functions: `user_has_campaign_access()` and `user_has_campaign_write()`.

### Data Layer

- **`lib/supabase/client.ts`** — Browser client (use in Client Components)
- **`lib/supabase/server.ts`** — Async server client (reads cookies + attaches Authorization header for RLS)
- **`lib/queries/`** — Async functions that call the server client; return typed data or null
- **`lib/actions/`** — Server Actions (`'use server'`); call `revalidatePath()` + `redirect()` after mutations; return `ActionResult` for errors
- **`lib/types.ts`** — All shared interfaces (`Campaign`, `Transcript`, `Video`, `ActionResult`, etc.)

### Active Campaign State

`context/CampaignContext.tsx` manages the active campaign client-side. It reads/writes an `active_campaign_id` cookie (30-day expiry). The `(app)/layout.tsx` initializes it server-side from that cookie or defaults to the first campaign. The Topbar dropdown drives switching via `useCampaign()`.

### UI Patterns

- Server Components fetch data and pass it as props to Client Components for interactivity.
- Client forms use `useActionState` for error/pending state.
- Inline actions (permission changes, removal) use `useTransition`.
- Permission gates: `isOwner = campaign.userRole === 'owner'`, `canWrite = isOwner || userRole === 'write'`. Owner-only pages call `notFound()` for non-owners.
- Tailwind v4: uses `@import "tailwindcss"` in `globals.css` (no config file).

### Invitation Flow

1. Owner calls `sendInvitation()` → creates row in `campaign_invitations` + sends email via Resend with `/invite/[token]` link.
2. `/invite/[token]` calls `get_invitation_by_token` RPC (SECURITY DEFINER, no auth required).
3. Unauthenticated visitors are redirected to `/login?redirect=/invite/[token]`.
4. On accept, `accept_campaign_invitation` RPC atomically inserts into `campaign_members` and sets `accepted_at`.

### Database

Schema lives in `supabase/migrations/001_initial_schema.sql`. Must be run manually in the Supabase SQL editor (no CLI migration runner configured). Tables: `profiles`, `campaigns`, `campaign_members`, `campaign_invitations`, `transcripts`, `characters`, `videos`, `video_transcripts`.

A DB trigger `on_auth_user_created` auto-creates a `profiles` row on signup, reading `display_name` from `raw_user_meta_data`.

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL       # Used in invitation email links
RESEND_API_KEY
RESEND_FROM_EMAIL
```

### Pages Not Yet Wired to Real Data

- `app/(app)/dashboard/page.tsx` — placeholder stats
- `app/(app)/transcripts/` — listing and detail pages
- `app/(app)/videos/` — listing and detail pages
- `app/(app)/campaigns/[id]/generate/page.tsx` — AI video generation (backend not built)
