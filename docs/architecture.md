# Lore App — Technical Architecture

## Tech Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | Next.js (App Router) | 16 | Server Components, Server Actions, Middleware |
| UI Library | React | 19 | `useActionState`, `useTransition` |
| Language | TypeScript | 5 | Strict mode |
| Styling | Tailwind CSS | 4 | Utility-first, no component library |
| Icons | lucide-react | latest | Tree-shakeable SVG icons |
| Database & Auth | Supabase | — | Postgres + RLS + Auth + Realtime |
| Email | Resend | — | Transactional invitation emails |
| Package Manager | npm | — | `package-lock.json` committed |

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│  React Client Components (islands of interactivity) │
└────────────────────┬────────────────────────────┘
                     │ HTTP / RSC Protocol
┌────────────────────▼────────────────────────────┐
│              Next.js Server                      │
│  ┌─────────────┐  ┌──────────────────────────┐  │
│  │ Middleware   │  │  React Server Components  │  │
│  │ (proxy.ts)  │  │  Server Actions           │  │
│  └─────────────┘  └──────────────┬───────────┘  │
└─────────────────────────────────┬───────────────┘
                                  │ Supabase JS SDK
              ┌───────────────────▼───────────────┐
              │             Supabase               │
              │  ┌──────────┐  ┌───────────────┐  │
              │  │ Postgres  │  │  Supabase Auth│  │
              │  │ (+ RLS)   │  │  (JWT/Cookie) │  │
              │  └──────────┘  └───────────────┘  │
              └───────────────────────────────────┘
                                  │
              ┌───────────────────▼───────────────┐
              │               Resend               │
              │       Transactional Email API      │
              └───────────────────────────────────┘
```

---

## Directory Structure

```
lore-app/
├── app/
│   ├── layout.tsx               ← Root HTML shell, global fonts/styles
│   ├── page.tsx                 ← Landing / marketing page
│   ├── (auth)/                  ← Auth route group (no shared layout)
│   │   ├── login/page.tsx       ← Login form
│   │   └── register/page.tsx    ← Registration form
│   ├── (app)/                   ← Authenticated route group
│   │   ├── layout.tsx           ← App shell: topbar, sidebar, CampaignProvider
│   │   ├── dashboard/page.tsx   ← Dashboard (stat cards, activity feed)
│   │   ├── campaigns/
│   │   │   ├── page.tsx         ← Campaign list
│   │   │   ├── new/page.tsx     ← Create campaign form
│   │   │   └── [id]/
│   │   │       ├── page.tsx     ← Campaign detail (tabbed)
│   │   │       ├── edit/page.tsx
│   │   │       └── generate/page.tsx  ← Video generation wizard
│   │   ├── transcripts/
│   │   │   ├── page.tsx         ← Global transcript list
│   │   │   └── [id]/page.tsx    ← Transcript viewer
│   │   └── videos/
│   │       ├── page.tsx         ← Global video grid
│   │       └── [id]/page.tsx    ← Video detail
│   └── invite/
│       └── [token]/page.tsx     ← Public invitation acceptance page
├── components/                  ← Shared UI components (client + server)
├── context/
│   └── CampaignContext.tsx      ← Active campaign state + useCampaign hook
├── lib/
│   ├── types.ts                 ← All shared TypeScript interfaces
│   ├── supabase/
│   │   ├── client.ts            ← Browser Supabase client (singleton)
│   │   └── server.ts            ← Server Supabase client (async, cookies)
│   ├── queries/
│   │   ├── campaigns.ts         ← getUserCampaigns, getCampaignById, getCampaignMembers, getPendingInvitations
│   │   ├── transcripts.ts       ← getTranscriptsByCampaign, getAllUserTranscripts, getTranscriptById
│   │   ├── characters.ts        ← getCharactersByCampaign
│   │   └── videos.ts            ← getVideosByCampaign, getAllUserVideos, getVideoById
│   ├── actions/
│   │   ├── campaigns.ts         ← createCampaign, updateCampaign, deleteCampaign
│   │   ├── invitations.ts       ← sendInvitation, acceptInvitation, revokeInvitation
│   │   ├── members.ts           ← updateMemberPermission, removeMember
│   │   └── profile.ts           ← updateProfile
│   └── email/
│       └── resend.ts            ← sendInvitationEmail
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  ← Full DB schema (run once in Supabase SQL editor)
├── proxy.ts                     ← Next.js middleware logic
├── middleware.ts                 ← Re-exports from proxy.ts (Next.js convention)
└── docs/                        ← This documentation
```

---

## Database Schema

### `profiles`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | References `auth.users.id` |
| `display_name` | `text` | Set from signup metadata |
| `avatar_url` | `text` | Optional |
| `created_at` | `timestamptz` | Auto-set |
| `updated_at` | `timestamptz` | Auto-updated |

### `campaigns`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `owner_id` | `uuid` FK → `profiles.id` | The DM |
| `name` | `text` | Required |
| `description` | `text` | Optional |
| `system` | `text` | e.g. "D&D 5e" |
| `setting` | `text` | World/setting name |
| `status` | `text` | `draft \| active \| completed \| archived` |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### `campaign_members`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `campaign_id` | `uuid` FK → `campaigns.id` | |
| `user_id` | `uuid` FK → `profiles.id` | |
| `permission` | `text` | `read \| write` |
| `joined_at` | `timestamptz` | |

Note: The campaign owner is **not** in this table. Ownership is tracked in `campaigns.owner_id`.

### `campaign_invitations`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `campaign_id` | `uuid` FK → `campaigns.id` | |
| `invited_by` | `uuid` FK → `profiles.id` | Must be owner |
| `email` | `text` | Invitee's email |
| `permission` | `text` | `read \| write` |
| `token` | `text` | DB-generated hex token (unique) |
| `created_at` | `timestamptz` | |
| `accepted_at` | `timestamptz` | Null until accepted |

### `transcripts`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `campaign_id` | `uuid` FK → `campaigns.id` | |
| `title` | `text` | |
| `content` | `text` | Raw transcript text |
| `source` | `text` | `discord \| manual \| upload` |
| `session_number` | `int` | |
| `session_date` | `date` | |
| `duration_minutes` | `int` | |
| `word_count` | `int` | |
| `status` | `text` | `pending \| processing \| processed \| failed` |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### `characters`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `campaign_id` | `uuid` FK → `campaigns.id` | |
| `player_id` | `uuid` FK → `profiles.id` | Optional |
| `name` | `text` | |
| `class` | `text` | |
| `race` | `text` | |
| `level` | `int` | |
| `created_at` | `timestamptz` | |

### `videos`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `campaign_id` | `uuid` FK → `campaigns.id` | |
| `title` | `text` | |
| `description` | `text` | |
| `url` | `text` | Storage URL (null until generated) |
| `thumbnail_url` | `text` | |
| `duration_seconds` | `int` | |
| `style` | `text` | Visual style tag |
| `status` | `text` | `pending \| processing \| completed \| failed` |
| `created_by` | `uuid` FK → `profiles.id` | |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### `video_transcripts` (join table)
| Column | Type | Notes |
|--------|------|-------|
| `video_id` | `uuid` FK → `videos.id` | |
| `transcript_id` | `uuid` FK → `transcripts.id` | |
| PK | `(video_id, transcript_id)` | |

### Triggers
| Trigger | Table | Event | Action |
|---------|-------|-------|--------|
| `on_auth_user_created` | `auth.users` | INSERT | Creates a row in `profiles` from `raw_user_meta_data` |

---

## RLS Security Model

### Helper Functions
Two `SECURITY INVOKER` functions are used across policies to centralise access logic:

```sql
-- Returns true if the calling user is the owner or a member of the campaign
user_has_campaign_access(campaign_id uuid) → boolean

-- Returns true if the calling user is the owner, or a member with 'write' permission
user_has_campaign_write(campaign_id uuid) → boolean
```

### Policy Matrix

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `profiles` | Own row | — | Own row | — |
| `campaigns` | `user_has_campaign_access` | Authenticated | Owner only | Owner only |
| `campaign_members` | `user_has_campaign_access` | Owner only | Owner only | Owner only |
| `campaign_invitations` | Owner only | Owner only | Owner only | Owner only |
| `transcripts` | `user_has_campaign_access` | `user_has_campaign_write` | `user_has_campaign_write` | Owner only |
| `characters` | `user_has_campaign_access` | `user_has_campaign_write` | `user_has_campaign_write` | Owner only |
| `videos` | `user_has_campaign_access` | Owner only | Owner only | Owner only |
| `video_transcripts` | `user_has_campaign_access` | Owner only | — | Owner only |

### SECURITY DEFINER RPCs
These functions bypass RLS and handle their own access checks internally:

| Function | Purpose |
|----------|---------|
| `get_invitation_by_token(token text)` | Returns invitation + campaign details for the `/invite/[token]` page. Works without authentication (no JWT required). |
| `accept_campaign_invitation(token text)` | Atomically inserts a `campaign_members` row and sets `accepted_at` on the invitation. Validates the invitation is pending and the current user matches the invited email. |

---

## Auth & Session Management

### Signup Flow
1. User submits display name, email, and password.
2. `supabase.auth.signUp()` is called with `options.data = { display_name }`.
3. Supabase sends a confirmation email.
4. On confirmation, `on_auth_user_created` trigger fires and inserts a row into `profiles` reading `display_name` from `raw_user_meta_data`.

### Login Flow
1. User submits email and password.
2. `supabase.auth.signInWithPassword()` is called.
3. Supabase sets a session cookie (`sb-*-auth-token`).
4. The login page reads `?redirect=` and uses `router.push()` to navigate post-auth, or falls back to `/dashboard`.

### Sign-Out
`supabase.auth.signOut()` clears the session cookie. The user is redirected to `/login`.

### Supabase Client Variants

| Client | File | Used In | Cookie Handling |
|--------|------|---------|-----------------|
| Browser client | `lib/supabase/client.ts` | Client Components | Reads/writes cookies directly in browser |
| Server client | `lib/supabase/server.ts` | Server Components, Server Actions | Uses Next.js `cookies()` from `next/headers` |
| Middleware client | (inline in `proxy.ts`) | `middleware.ts` | Uses `@supabase/ssr` middleware helpers to refresh tokens |

---

## Middleware & Routing

### `proxy.ts` Logic
The middleware runs on every non-static request (see matcher below). It:
1. Creates a Supabase client using the middleware helper to refresh the session cookie.
2. Reads the current session.
3. If the route is protected and the user is not authenticated: redirects to `/login?redirect=<original-path>`.
4. If the route is an auth page (`/login`, `/register`) and the user is authenticated: redirects to `/dashboard`.

### Protected Routes
All paths under `/dashboard`, `/campaigns`, `/transcripts`, `/videos`.

### Matcher
```ts
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```
Excludes Next.js static assets and common image formats to avoid unnecessary middleware overhead.

---

## Data Fetching Pattern

Server Components are the default. The pattern is:

```
Page (Server Component)
  └── query function (lib/queries/*.ts)
        └── Supabase server client
              └── Typed data returned
                    └── Passed as props to Client Component
```

### Example: `getUserCampaigns`
Returns campaigns where the user is either the owner (`campaigns.owner_id = auth.uid()`) or a member (`campaign_members.user_id = auth.uid()`). It derives a `userRole` field (`'owner' | 'write' | 'read'`) client-side from the join result so that components can gate UI based on role without extra queries.

### Typed Query Returns
All query functions return fully-typed objects matching the interfaces in `lib/types.ts`. The interfaces mirror the DB schema with joined data inlined (e.g. `CampaignWithRole` extends `Campaign` with `userRole`).

---

## Server Actions Pattern

All mutations are implemented as Next.js Server Actions in `lib/actions/*.ts`.

### Structure
```ts
'use server'

export async function doSomething(formData: FormData): Promise<ActionResult<T>> {
  // 1. Create server Supabase client
  const supabase = await createClient()

  // 2. Verify session (auth check)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 3. Perform DB operation
  const { data, error } = await supabase.from('table').insert(...)

  // 4. Handle error
  if (error) return { success: false, error: error.message }

  // 5. Revalidate affected pages
  revalidatePath('/campaigns')

  // 6. Return success (or redirect)
  return { success: true, data }
}
```

### `ActionResult<T>` Type
```ts
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }
```

### Client-Side Integration

| Hook | Use Case |
|------|---------|
| `useActionState` | Form submissions. Provides `state` (last `ActionResult`) and `isPending`. Replaces `useState` + manual fetch. |
| `useTransition` | Inline actions (e.g. permission toggle, remove member). Provides `isPending` without full form re-render. |

---

## Email System

### `sendInvitationEmail` (`lib/email/resend.ts`)
Called from the `sendInvitation` server action after the invitation row is created.

Options passed:
- `to`: invitee email
- `campaignName`: inserted into subject/body
- `inviterName`: display name of the DM
- `permission`: `read | write`
- `acceptUrl`: full URL `${NEXT_PUBLIC_APP_URL}/invite/${token}`

The email body is an inline HTML string (no template engine). It is intentionally simple for maintainability.

### Failure Tolerance
If `sendInvitationEmail` throws or returns an error, the server action logs the error but **does not roll back the invitation row**. The invitation remains valid and the DM can share the link manually.

---

## Campaign Context

### Provider Initialisation
`CampaignProvider` is rendered in `app/(app)/layout.tsx`. On the server, it reads the `active_campaign_id` cookie using `cookies()` from `next/headers`. This value is passed as `initialCampaignId` to the client provider.

### Cookie Persistence
When the user selects a campaign from the topbar dropdown, the client component writes:
```ts
document.cookie = `active_campaign_id=${id}; path=/; max-age=...`
```
This persists across page loads so the active campaign is remembered without a server roundtrip.

### `useCampaign` Hook API
```ts
const {
  activeCampaign,     // Campaign | null
  campaigns,          // Campaign[]
  setActiveCampaign,  // (id: string) => void
  isLoading,          // boolean
} = useCampaign()
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `NEXT_PUBLIC_APP_URL` | Yes | Base URL of the deployed app (used in invitation links) |
| `RESEND_API_KEY` | Yes | API key from resend.com |
| `RESEND_FROM_EMAIL` | Yes | Verified sender address on Resend |

---

## Supabase One-Time Setup

Run the contents of `supabase/migrations/001_initial_schema.sql` in the Supabase SQL editor for your project.

This migration creates:
- All 8 tables with appropriate column types and constraints
- Foreign key relationships
- Row-Level Security enabled on all tables
- All RLS policies (using helper functions)
- The `on_auth_user_created` trigger and its handler function
- `user_has_campaign_access` and `user_has_campaign_write` helper functions
- `get_invitation_by_token` and `accept_campaign_invitation` SECURITY DEFINER RPCs

The migration is idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`).
