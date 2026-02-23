# Lore App — Testing Implementation Guide

This document defines the complete testing strategy for the Lore App. It is the authoritative reference for the testing setup and must be kept up to date as new features are added.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Package Installation](#package-installation)
3. [File Structure](#file-structure)
4. [Configuration Files](#configuration-files)
5. [Test Helper Implementations](#test-helper-implementations)
6. [Unit Test Specifications](#unit-test-specifications)
7. [Integration Test Specifications](#integration-test-specifications)
8. [E2E Test Specifications](#e2e-test-specifications)
9. [CI/CD Workflow](#cicd-workflow)
10. [Supabase Local Setup](#supabase-local-setup)
11. [Adding Tests for New Features](#adding-tests-for-new-features)
12. [NPM Scripts](#npm-scripts)

---

## Architecture Overview

Three testing layers with distinct responsibilities:

| Layer | Tool | Trigger | Purpose |
|---|---|---|---|
| Unit | Vitest + React Testing Library | Every PR | Actions, queries, components, context, middleware — all mocked |
| Integration | Vitest + Supabase Local | Every PR | Real Postgres + RLS + RPCs; no mocks |
| E2E | Playwright | Push to `main` | Full user journeys through the browser |

Coverage thresholds (unit only): **70% lines/functions, 60% branches**.

---

## Package Installation

Run once in the repo root:

```bash
npm install --save-dev \
  vitest@3 @vitejs/plugin-react@4 @vitest/coverage-v8@3 jsdom@26 \
  @testing-library/react@16 @testing-library/user-event@14 \
  @testing-library/jest-dom@6 @playwright/test@1 vite-tsconfig-paths@5
```

Install Playwright browsers after the above:

```bash
npx playwright install chromium
```

---

## File Structure

```
tests/
  unit/
    setup.ts                              ← global mocks (next/navigation, next/cache, next/headers)
    helpers/
      builders.ts                         ← typed factory functions (buildCampaign, buildMember, etc.)
      campaign-context.tsx                ← renderWithCampaignContext helper
    lib/
      actions/
        campaigns.test.ts
        invitations.test.ts
        members.test.ts
        profile.test.ts
      queries/
        campaigns.test.ts
    components/
      CampaignForm.test.tsx
      InviteMemberForm.test.tsx
      MemberList.test.tsx
      CampaignDetailTabs.test.tsx
      Badge.test.tsx                      ← smoke test
      Button.test.tsx                     ← smoke test
  integration/
    setup.ts                              ← dotenv loader for .env.test
    helpers/
      db.ts                               ← createTestUser(), seedCampaign(), teardown()
    campaigns.test.ts
    invitations.test.ts
    members.test.ts
  e2e/
    fixtures/
      auth.setup.ts                       ← Playwright storageState login
    auth.spec.ts
    campaigns.spec.ts
    invite.spec.ts

vitest.config.ts                          ← unit: jsdom, setupFiles, coverage
vitest.integration.config.ts              ← integration: node, serial, 30s timeout
playwright.config.ts                      ← baseURL, chromium, webServer
.env.test                                 ← local Supabase URLs (gitignored)
.github/workflows/ci.yml
```

---

## Configuration Files

### `vitest.config.mts`

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/unit/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    environmentMatchGlobs: [
      // Middleware uses Next.js edge runtime. jsdom replaces native Headers
      // which breaks NextResponse.next(). Run in node env to use native fetch.
      ['tests/unit/components/middleware.test.ts', 'node'],
    ],
    coverage: {
      provider: 'v8',
      include: [
        'lib/actions/**',
        'lib/queries/**',
        'context/**',
        'components/**',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
      },
    },
  },
});
```

### `vitest.integration.config.mts`

```ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/integration/setup.ts'],
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 30000,
    sequence: { concurrent: false },
  },
});
```

### `playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### `.env.test`

This file is gitignored. Values come from `supabase start` output:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=re_test_placeholder
RESEND_FROM_EMAIL=test@lore-test.local
E2E_DM_EMAIL=dm@lore-test.local
E2E_DM_PASSWORD=Password123!
```

Add to `.gitignore`:

```
.env.test
tests/e2e/.auth/
```

---

## Test Helper Implementations

### `tests/unit/setup.ts`

Global mocks applied before every unit test.

```ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    getAll: vi.fn(() => []),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(() => new Map()),
}));
```

### `tests/unit/helpers/builders.ts`

```ts
import type {
  Campaign, CampaignWithRole, CampaignMember, Invitation,
  Transcript, Video, Profile,
} from '@/lib/types';

let _counter = 0;
const uid = () => `00000000-0000-0000-0000-${String(++_counter).padStart(12, '0')}`;

export const OWNER_ID    = '00000000-0000-0000-0001-000000000001';
export const MEMBER_ID   = '00000000-0000-0000-0001-000000000002';
export const STRANGER_ID = '00000000-0000-0000-0001-000000000003';
export const CAMPAIGN_ID = '00000000-0000-0000-0002-000000000001';

export function buildCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: CAMPAIGN_ID,
    name: 'Test Campaign',
    description: null,
    system: 'D&D 5e',
    setting: null,
    status: 'active',
    owner_id: OWNER_ID,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function buildCampaignWithRole(
  overrides: Partial<CampaignWithRole> = {}
): CampaignWithRole {
  return { ...buildCampaign(), userRole: 'owner', ...overrides };
}

export function buildMember(overrides: Partial<CampaignMember> = {}): CampaignMember {
  return {
    id: uid(),
    campaign_id: CAMPAIGN_ID,
    user_id: MEMBER_ID,
    permission: 'read',
    invited_by: OWNER_ID,
    created_at: '2024-01-01T00:00:00Z',
    profile: { id: MEMBER_ID, display_name: 'Test Player', avatar_url: null },
    ...overrides,
  };
}

export function buildInvitation(overrides: Partial<Invitation> = {}): Invitation {
  return {
    id: uid(),
    campaign_id: CAMPAIGN_ID,
    invited_by: OWNER_ID,
    email: 'invitee@lore-test.local',
    permission: 'read',
    token: 'test-token-abc123',
    expires_at: '2099-01-01T00:00:00Z',
    accepted_at: null,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function buildProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: OWNER_ID,
    display_name: 'Test DM',
    avatar_url: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function buildTranscript(overrides: Partial<Transcript> = {}): Transcript {
  return {
    id: uid(),
    campaign_id: CAMPAIGN_ID,
    title: 'Session 1',
    session_number: 1,
    content: 'The party gathered at the tavern...',
    source: 'manual',
    status: 'pending',
    duration_minutes: null,
    session_date: null,
    uploaded_by: OWNER_ID,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function buildVideo(overrides: Partial<Video> = {}): Video {
  return {
    id: uid(),
    campaign_id: CAMPAIGN_ID,
    title: 'Epic Encounter',
    style: 'cinematic',
    status: 'pending',
    storage_path: null,
    duration_seconds: null,
    requested_by: OWNER_ID,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}
```

### `tests/unit/helpers/campaign-context.tsx`

```tsx
import { render, type RenderOptions } from '@testing-library/react';
import { CampaignProvider } from '@/context/CampaignContext';
import { buildCampaignWithRole, CAMPAIGN_ID } from './builders';
import type { CampaignWithRole } from '@/lib/types';
import type { ReactElement, ReactNode } from 'react';

interface WrapperOptions {
  campaigns?: CampaignWithRole[];
  initialActiveCampaignId?: string | null;
}

export function renderWithCampaignContext(
  ui: ReactElement,
  {
    campaigns = [buildCampaignWithRole()],
    initialActiveCampaignId = CAMPAIGN_ID,
    ...renderOptions
  }: WrapperOptions & RenderOptions = {}
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <CampaignProvider
        campaigns={campaigns}
        initialActiveCampaignId={initialActiveCampaignId}
      >
        {children}
      </CampaignProvider>
    );
  }
  return render(ui, { wrapper: Wrapper, ...renderOptions });
}
```

### `tests/integration/setup.ts`

```ts
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.test') });
```

### `tests/integration/helpers/db.ts`

Uses the service role key directly — bypasses RLS for seeding and teardown.

```ts
import { createClient } from '@supabase/supabase-js';

export const adminDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export interface TestUser {
  id: string;
  email: string;
  accessToken: string;
}

export async function createTestUser(email: string, password = 'Password123!'): Promise<TestUser> {
  const { data, error } = await adminDb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: email.split('@')[0] },
  });
  if (error || !data.user) throw new Error(`createTestUser failed: ${error?.message}`);

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const { data: session, error: signInError } = await anonClient.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError || !session.session) throw new Error(`signIn failed: ${signInError?.message}`);

  return { id: data.user.id, email, accessToken: session.session.access_token };
}

export async function seedCampaign(ownerId: string, overrides: Record<string, unknown> = {}) {
  const { data, error } = await adminDb
    .from('campaigns')
    .insert({ name: 'Integration Test Campaign', system: 'D&D 5e', owner_id: ownerId, ...overrides })
    .select('id')
    .single();
  if (error || !data) throw new Error(`seedCampaign failed: ${error?.message}`);
  return data.id as string;
}

export async function seedMember(
  campaignId: string,
  userId: string,
  invitedBy: string,
  permission: 'read' | 'write' = 'read'
) {
  const { error } = await adminDb
    .from('campaign_members')
    .insert({ campaign_id: campaignId, user_id: userId, invited_by: invitedBy, permission });
  if (error) throw new Error(`seedMember failed: ${error.message}`);
}

export async function seedInvitation(
  campaignId: string,
  invitedBy: string,
  email: string,
  permission: 'read' | 'write' = 'read'
) {
  const { data, error } = await adminDb
    .from('campaign_invitations')
    .insert({ campaign_id: campaignId, invited_by: invitedBy, email, permission })
    .select('id, token')
    .single();
  if (error || !data) throw new Error(`seedInvitation failed: ${error?.message}`);
  return data as { id: string; token: string };
}

export async function teardown(userIds: string[]) {
  for (const id of userIds) {
    await adminDb.auth.admin.deleteUser(id);
  }
}
```

---

## Unit Test Specifications

### Mock Pattern for Supabase Clients

Every action and query test mocks `@/lib/supabase/server`. The mock exposes `mockGetUser`, `mockFrom`, and `mockRpc` that tests configure per-case.

```ts
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({ from: mockFrom, rpc: mockRpc })),
}));

// Helper: build a chainable query builder resolving with { data, error }
function mockQuery(data: unknown, error: unknown = null) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'in', 'is', 'order'];
  methods.forEach((m) => { chain[m] = vi.fn().mockReturnValue(chain); });
  chain.single = vi.fn().mockResolvedValue({ data, error });
  // Allow top-level await (non-.single() queries)
  (chain as unknown as Promise<unknown>).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data, error }).then(resolve);
  return chain;
}
```

> **`redirect()` in tests**: It is mocked as a plain `vi.fn()`. Assert with
> `expect(redirect).toHaveBeenCalledWith('/path')` — do NOT use try/catch.

---

### Priority 1 — `lib/actions/campaigns.ts`

Standard 5-case pattern for each action: unauthenticated, validation error, ownership/scope, happy path, DB error.

Notable cases:

- `createCampaign` happy path: assert `revalidatePath('/campaigns')` and `redirect('/campaigns/<id>')`.
- `updateCampaign` scopes the update with `.eq('owner_id', user.id)` — a non-owner's call produces no DB error but changes 0 rows; the action still redirects (acceptable — the missing ownership check is enforced at the query layer).
- `deleteCampaign` happy path: assert `redirect('/campaigns')`.

### Priority 1 — `lib/actions/invitations.ts`

Extra cases beyond the standard 5:

- `sendInvitation`: returns `{ error: 'An invitation for this email already exists' }` when DB error code is `'23505'`.
- `sendInvitation`: succeeds (returns `{}`) even when `sendInvitationEmail` throws — email failure must **not** roll back the invitation.
- `acceptInvitation`: RPC error → returns `{ error: <message> }`; success → `redirect('/campaigns/<id>')`.
- `revokeInvitation`: two-step ownership check — returns `'Invitation not found'` then `'Access denied'` on failures.

Mock `sendInvitationEmail`:

```ts
vi.mock('@/lib/email/resend', () => ({
  sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
}));
```

### Priority 1 — `lib/actions/members.ts`

Both `updateMemberPermission` and `removeMember` follow the same 5-case pattern. The ownership check is a two-step lookup: first fetch the member's `campaign_id`, then verify `campaigns.owner_id === user.id`.

### Priority 1 — `lib/actions/profile.ts`

4 cases: unauthenticated, missing `display_name`, success (assert `revalidatePath('/', 'layout')`), DB error.

### Priority 2 — `lib/queries/campaigns.ts`

`getCampaignById` contains all access-control logic. Key assertions:

- Owner path: `adminClient.from` called **once** (no membership lookup).
- Write/read member path: `from` called **twice** — campaign row then membership row.
- Stranger (no membership): `from` called twice, second returns `null` → function returns `null`.
- Non-existent campaign: first `from` returns `{ data: null, error: ... }` → returns `null`.

### Priority 3 — `context/CampaignContext.tsx`

- `useCampaign` outside provider throws `'useCampaign must be used within CampaignProvider'`.
- `setActiveCampaignId(id)` writes `document.cookie` with `active_campaign_id=<id>` and 30-day `max-age`.
- `setActiveCampaignId(null)` writes cookie with `max-age=0`.
- `activeCampaign` is derived — updates when `setActiveCampaignId` is called.

### Priority 4 — `lib/supabase/proxy.ts` (middleware)

Mock `@supabase/ssr` to control `getClaims` return value. Construct real `NextRequest` objects:

```ts
function makeRequest(pathname: string) {
  return new NextRequest(new URL(pathname, 'http://localhost:3000'));
}
```

Unauthenticated: `/dashboard`, `/campaigns`, `/transcripts`, `/videos` → 307 to `/login?redirect=<path>`.
Unauthenticated: `/login`, `/register`, `/invite/abc` → pass through (status !== 307).
Authenticated: `/login`, `/register` → 307 to `/dashboard`.
Authenticated: `/dashboard`, `/campaigns` → pass through.

### Priority 5 — UI Components

**`CampaignForm`**: renders fields; shows error from action result; disables button while pending; `showStatus` prop controls status select visibility; `defaultValues` pre-fills inputs.

**`InviteMemberForm`**: shows error on `{ error: '...' }`; shows success message on `{}`; disables button while pending. Mock `sendInvitation` at module level.

**`MemberList`**: owner row always renders first; `updateMemberPermission` called on permission select change; `removeMember` called on Remove click; pending disables controls; pending invitations section hidden when `invitations` is empty.

**`CampaignDetailTabs`**: owner sees Members tab + Edit button; non-owner does not see Members tab; read member sees neither Edit nor Generate Video; write member sees Generate Video but not Edit.

**Smoke tests** (`Badge`, `Button`): render without crashing, accept expected props.

---

## Integration Test Specifications

Tests run against live local Supabase. Use real DB, real RLS, real RPCs — no Supabase mocks.

Because `createClient` / `createAdminClient` read env vars at import time, integration test files must construct their own Supabase clients with user JWTs from `createTestUser()` rather than calling the query/action functions directly. Instead, call the underlying Supabase client with the test user's access token to verify DB behavior.

### `tests/integration/campaigns.test.ts`

- DM gets `userRole: 'owner'` from `getCampaignById`.
- Write member gets `userRole: 'write'`.
- Read member gets `userRole: 'read'`.
- Stranger (no membership) gets `null`.
- `getUserCampaigns` for DM returns owned campaigns.
- `getUserCampaigns` for write member returns member campaigns with correct role.

### `tests/integration/invitations.test.ts`

Test the `accept_campaign_invitation` RPC directly via `adminDb.rpc(...)`:

- Happy path: member row inserted, `accepted_at` set.
- Expired invitation (set `expires_at` to past timestamp): returns error.
- Already-accepted invitation: returns error.
- Non-existent token: returns error.
- Duplicate membership: unique constraint prevents double-accept.

### `tests/integration/members.test.ts`

- Owner can update member permission via `updateMemberPermission` action.
- Non-owner attempt returns `{ error: 'Access denied' }`.
- Owner can remove member via `removeMember`.
- Removed member's `getCampaignById` returns `null`.

---

## E2E Test Specifications

### `tests/e2e/fixtures/auth.setup.ts`

Logs in as the canonical DM account (`dm@lore-test.local`) and saves `storageState` to `tests/e2e/.auth/user.json`. This file is reused by all subsequent E2E tests.

```ts
import { test as setup } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

setup('authenticate as DM', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', process.env.E2E_DM_EMAIL!);
  await page.fill('input[type="password"]', process.env.E2E_DM_PASSWORD!);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
  await page.context().storageState({ path: authFile });
});
```

### `tests/e2e/auth.spec.ts`

- Unauthenticated → `/dashboard` redirects to `/login?redirect=%2Fdashboard`.
- Authenticated → `/login` redirects to `/dashboard`.
- Login with wrong password shows error.
- Register → creates account → redirects to `/dashboard`.

### `tests/e2e/campaigns.spec.ts`

- DM creates campaign → redirected to `/campaigns/<id>` → campaign name visible.
- DM edits campaign → changes reflected.
- DM deletes campaign → redirected to `/campaigns`.
- Read member cannot see Edit button on campaign detail page.
- Write member sees Generate Video button.

### `tests/e2e/invite.spec.ts`

- DM sends invite → "Invitation sent successfully" message appears.
- Unauthenticated user visiting `/invite/<token>` is redirected through `/login`.
- Accepting invitation adds user to campaign and redirects to campaign page.
- Expired invitation shows error.

---

## CI/CD Workflow

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  lint-typecheck:
    name: Lint & Typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit

  unit:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: lint-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
      - run: npm ci
      - run: npm run test:coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage
          path: coverage/

  integration:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: lint-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: supabase start
      - run: supabase db reset
      - name: Write .env.test
        run: |
          STATUS=$(supabase status --output json)
          echo "NEXT_PUBLIC_SUPABASE_URL=$(echo $STATUS | jq -r '.API_URL')" >> .env.test
          echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$(echo $STATUS | jq -r '.ANON_KEY')" >> .env.test
          echo "SUPABASE_SERVICE_ROLE_KEY=$(echo $STATUS | jq -r '.SERVICE_ROLE_KEY')" >> .env.test
          echo "NEXT_PUBLIC_APP_URL=http://localhost:3000" >> .env.test
          echo "RESEND_API_KEY=re_test_placeholder" >> .env.test
          echo "RESEND_FROM_EMAIL=test@lore-test.local" >> .env.test
      - run: npm ci
      - run: npm run test:integration

  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [unit, integration]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: supabase start
      - run: supabase db reset
      - name: Write .env.test
        run: |
          STATUS=$(supabase status --output json)
          echo "NEXT_PUBLIC_SUPABASE_URL=$(echo $STATUS | jq -r '.API_URL')" >> .env.test
          echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$(echo $STATUS | jq -r '.ANON_KEY')" >> .env.test
          echo "SUPABASE_SERVICE_ROLE_KEY=$(echo $STATUS | jq -r '.SERVICE_ROLE_KEY')" >> .env.test
          echo "NEXT_PUBLIC_APP_URL=http://localhost:3000" >> .env.test
          echo "RESEND_API_KEY=re_test_placeholder" >> .env.test
          echo "RESEND_FROM_EMAIL=test@lore-test.local" >> .env.test
          echo "E2E_DM_EMAIL=dm@lore-test.local" >> .env.test
          echo "E2E_DM_PASSWORD=Password123!" >> .env.test
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Supabase Local Setup

### Initial setup (once per developer machine)

```bash
# Initialize — creates supabase/config.toml (commit this file)
npx supabase init

# Start local Postgres + Auth + Studio
npx supabase start

# Apply migrations (re-runs 001_initial_schema.sql, wipes all data)
npx supabase db reset
```

`supabase start` prints the local anon key and service role key. Copy these into `.env.test`.

### Resetting between dirty runs

Integration tests are self-contained (each `beforeAll` creates users, `afterAll` deletes them). If DB state becomes dirty:

```bash
npx supabase db reset
```

---

## Adding Tests for New Features

| What was added | Write this test | Location |
|---|---|---|
| New Server Action | 5 standard cases: unauthenticated, validation, ownership, happy path, DB error | `tests/unit/lib/actions/<name>.test.ts` |
| New query function | Unit mock + integration if access-control logic exists | `tests/unit/lib/queries/<name>.test.ts` |
| New Client Component | RTL: render, conditional display, action invocation, error/success | `tests/unit/components/<Name>.test.tsx` |
| New route/page | E2E: unauthenticated redirect + happy path | `tests/e2e/<feature>.spec.ts` |
| New RPC in migration | Integration: all error conditions + happy path | `tests/integration/<feature>.test.ts` |
| New field in `lib/types.ts` | Update the relevant `build*()` factory | `tests/unit/helpers/builders.ts` |
| New permission gate | owner sees X / member does not | Add to nearest component test |

### Canonical test users

All at domain `lore-test.local`, password `Password123!`:

| Email | Role |
|---|---|
| `dm@lore-test.local` | Campaign owner (DM) |
| `player-write@lore-test.local` | Write member |
| `player-read@lore-test.local` | Read member |
| `stranger@lore-test.local` | No membership |
| `invitee@lore-test.local` | Target of invitation tests |

---

## NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.mts",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## Verification Checklist

After implementation:

1. `npm run test` — all unit tests pass
2. `npm run test:integration` — all integration tests pass (requires `npx supabase start`)
3. `npm run build` — no TypeScript errors
4. `npm run test:e2e` — all E2E tests pass (requires `npx supabase start` + `npm run dev`)
5. GitHub Actions on a test PR → lint, unit, integration jobs green
6. Push to `main` → E2E job runs and passes
