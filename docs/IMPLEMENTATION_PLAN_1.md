# Font Subscription Platform — MVP Implementation Plan (Revised)

> **Objective:** Build a fully functional v1 locally without signing up for any third-party services. External dependencies are replaced with local equivalents behind simple interfaces so production cutover minimizes rewrites, even though some real integrations will still need to be built later.
>
> **Stack:** Next.js, PostgreSQL (Docker), local filesystem, mock auth, mock payments
>
> **What this MVP includes:**
>
> - Public font catalog with filtering by style, mood, and use case
> - Font detail pages with live in-browser preview and design mockups
> - User authentication with dev-mode magic links logged to console
> - Subscription gating with a mock checkout that creates real subscription and entitlement records
> - Gated font downloads with basic entitlement checks
> - Download logging with immutable attribution
> - Admin CLI scripts for user and entitlement management
> - Production-shaped core schema where it supports MVP behavior
>
> **Deferred to production cutover:**
>
> - Real Stripe, email delivery, R2, Sanity, and managed Postgres
> - Admin MFA
> - Entitlement exceptions
> - Reconciliation jobs and royalty snapshots
> - Admin web UI
>
> **Source-of-truth rules:**
>
> - **Catalog data:** local JSON files in `/data/fonts/` are the only source of truth for foundries, families, and weights. Postgres read-model tables are populated only by `scripts/sync-catalog.ts`.
> - **User/subscription/entitlement data:** Postgres, populated by `scripts/seed.ts` and runtime app behavior.
> - **Auth tables:** managed by the Auth.js Postgres adapter schema.
> - **Download font files:** `/data/font-files/downloads/` is canonical.
> - **Preview font files:** `/public/fonts/previews/` is the canonical MVP preview location.
> - **Mockups:** `/public/mockups/`.

## Architecture: Local Service Map


| Production Service | MVP Replacement                | Swap Effort                          |
| ------------------ | ------------------------------ | ------------------------------------ |
| Supabase / Neon    | Docker Postgres                | Change `DATABASE_URL`                |
| Sanity             | Local JSON in `/data/fonts/`   | Replace functions in `/lib/catalog/` |
| R2 downloads       | Local filesystem via API route | Replace functions in `/lib/storage/` |
| R2 previews        | `/public/fonts/previews/`      | Replace base URL                     |
| Stripe             | Mock checkout writing to DB    | Replace `/lib/payments/`             |
| Email provider     | Magic links logged to console  | Replace `/lib/auth/`                 |


## Phase 0: Project Scaffolding & Local Infrastructure

**Goal:** Next.js running with Docker Postgres. No app logic.

### 0.1 — Initialize Project

- Create Next.js app with TypeScript and App Router
- Confirm dev server runs on `localhost:3000`
- Set up:
  - `/app`
  - `/app/api`
  - `/app/(public)`
  - `/app/(auth)`
  - `/lib/db`
  - `/lib/auth`
  - `/lib/payments`
  - `/lib/storage`
  - `/lib/catalog`
  - `/lib/entitlements`
  - `/types`
  - `/scripts`
  - `/data/fonts`
  - `/data/font-files/downloads`
- Install:
  - runtime: `pg`, `next-auth`, `@auth/core`, `@auth/pg-adapter`, `uuid`
  - dev: `@types/pg`, `tsx`

### 0.2 — Docker Postgres

- Create `docker-compose.yml` with Postgres 16
- Create `.env.local`:
  - `DATABASE_URL=postgresql://fontapp:fontapp@localhost:5432/fontapp`
  - `NEXTAUTH_URL=http://localhost:3000`
  - `NEXTAUTH_SECRET=dev-secret-change-in-production`
  - `DEV_AUTH_BYPASS=true`

### 0.3 — Repo Setup

- Initialize git
- Add `.gitignore`
- Add `README.md`

### Checkpoint

- `docker compose up -d` works
- `npm run dev` works

## Phase 1: Database Schema, Types & Seed Data

**Goal:** Core schema deployed. Users/subscriptions seeded. Catalog tables empty until sync.

### 1.1 — Migration File

- Create `/scripts/migrations/001_initial_schema.sql`

**Auth section**

- Use the exact schema required by `@auth/pg-adapter`
- Do not hand-roll a near-match version
- If adapter docs differ from any draft schema, adapter docs win

**Custom application section**

- Extend `users` with:
  - `role TEXT NOT NULL DEFAULT 'subscriber' CHECK (role IN ('subscriber','admin'))`
  - `created_at`
  - `updated_at`
- Create:
  - `foundries`
  - `font_families`
  - `font_weights`
  - `subscriptions`
  - `entitlements`
  - `download_requested`
  - `admin_audit_log`
- Create schema-parity-but-unused-in-MVP tables only if you want future alignment:
  - `entitlement_exceptions`
  - `download_delivered`
  - `download_flags`
  - `stripe_webhook_events`
  - `royalty_snapshots`

**Required constraints**

- One active subscription per user via partial unique index
- One active entitlement per user via partial unique index
- `font_weights` and related read-model tables keyed by `sanity_document_id`

### 1.2 — Migration Runner

- Add `/scripts/run-migration.ts`
- Add `"migrate": "npx tsx scripts/run-migration.ts"`

### 1.3 — DB Client

- Add `/lib/db/client.ts` with `pg.Pool`
- Add `/lib/db/queries.ts`

### 1.4 — Types

- `/types/database.ts`
- `/types/catalog.ts`
- `/types/api.ts`

### 1.5 — Seed Data

- `/scripts/seed.ts` inserts only:
  - `admin@test.com` with role `admin`
  - `user@test.com` with active subscription + entitlement
  - `free@test.com` with no subscription
- Use deterministic UUIDs
- Use mock Stripe IDs
- Do not insert catalog rows
- Safe to re-run
- Add `"seed": "npx tsx scripts/seed.ts"`

### Checkpoint

- Migrations run
- Seed runs
- Catalog tables remain empty until sync

## Phase 2: Local Font Catalog

**Goal:** JSON-driven catalog with sync into Postgres read model.

### 2.1 — Catalog JSON

- Create `/data/fonts/foundries.json`
- Create `/data/fonts/families.json`
- Families include:
  - identity fields
  - foundry reference
  - description
  - style/mood/use-case tags
  - `featured`
  - `qa_status`
  - `weights[]`
  - `mockups[]`
- Populate 5 families across 2 foundries

### 2.2 — Assets

- Put downloadable fonts in `/data/font-files/downloads/`
- Put preview subsets directly in `/public/fonts/previews/`
- Put mockups in `/public/mockups/`

### 2.3 — Catalog Fetching

- `/lib/catalog/local.ts`:
  - `getAllPublishedFamilies()`
  - `getFamilyBySlug(slug)`
  - `getAllFoundries()`
- `/lib/catalog/index.ts` re-exports from local implementation

### 2.4 — Catalog Sync

- `/scripts/sync-catalog.ts`:
  - read JSON
  - upsert by `sanity_document_id`
  - preserve immutable UUIDs
  - mark missing records `is_active = false`
  - be idempotent
- This is the only writer for `foundries`, `font_families`, `font_weights`
- Add `"sync": "npx tsx scripts/sync-catalog.ts"`

### 2.5 — Setup Command

- Add `"setup": "npm run migrate && npm run sync && npm run seed"`

### Checkpoint

- JSON is the only catalog source
- Sync populates read model
- Setup command prepares a fresh DB

## Phase 3: Authentication (Dev Mode)

**Goal:** Local login works with console magic links and quick-login bypass.

### 3.1 — Auth.js Config

- `/lib/auth/config.ts`:
  - `@auth/pg-adapter`
  - database sessions
  - dev email transport that logs links
  - session callback includes `user.id` and `user.role`
- `/app/api/auth/[...nextauth]/route.ts`
- Verify actual adapter schema works end-to-end

### 3.2 — Login Pages

- `/app/(auth)/login/page.tsx`
- `/app/(auth)/verify/page.tsx`

### 3.3 — Dev Bypass

- `/app/api/auth/dev-login/route.ts`
- Only enabled when `DEV_AUTH_BYPASS=true`
- Quick-login buttons for seeded users

### 3.4 — Session Helpers

- `getSession`
- `requireAuth`
- `requireAdmin`

### 3.5 — Route Protection

- Middleware protects `/admin/`* URL paths if any admin pages are added later
- If MVP remains CLI-only for admin, do not add admin page routes yet
- Any future `/api/admin/*` handlers must call `requireAdmin` directly

### 3.6 — Rate Limiting

- In-memory rate limit for magic-link requests

### Checkpoint

- Login works
- Sessions persist
- Dev bypass works

## Phase 4: Mock Payments & Subscription Management

**Goal:** Mock subscribe/cancel flow with real DB records.

### 4.1 — Mock Payment Logic

- `/lib/payments/mock.ts`
- `createMockSubscription(userId)`:
  - reject if active subscription already exists
  - generate mock customer/subscription IDs
  - insert active subscription
  - insert active entitlement
- `cancelMockSubscription(userId)`:
  - mark subscription `cancelled`
  - mark entitlement `cancelled`
- `/lib/payments/index.ts` re-exports mock implementation

### 4.2 — API Routes

- `/app/api/checkout/route.ts`
- `/app/api/subscription/cancel/route.ts`

### 4.3 — Subscribe Page

- `/app/(public)/subscribe/page.tsx`
- Show subscribe state and cancel state
- Note that it is dev-mode mock billing

### 4.4 — Queries

- `getActiveSubscription`
- `getActiveEntitlement`
- `getUserByEmail`
- `getUserById`

### Checkpoint

- Subscribe/cancel works
- One subscription per user enforced

## Phase 5: Public Catalog & Font Detail Pages

**Goal:** Browseable public catalog with previews, details, and CTA states.

### 5.1 — Catalog Page

- `/app/(public)/fonts/page.tsx`
- Fetch from JSON layer
- Cross-reference read-model `is_active`
- Pass to client component for filtering

### 5.2 — Catalog Client

- Filter chips for style, mood, use case
- Font grid with preview specimen and mockup thumbnail

### 5.3 — Preview Font Loading

- Inject `@font-face` for `/fonts/previews/{preview_path}`
- Use `font-display: swap`

### 5.4 — Font Detail Page

- `/app/(public)/fonts/[slug]/page.tsx`
- Include:
  - hero
  - specimen
  - mockups
  - weights list
  - auth-aware download buttons
  - tags
  - foundry info

### 5.5 — Home + Nav

- Home page with featured fonts and CTA
- Shared nav with auth state

### Checkpoint

- Catalog and detail pages work
- Preview fonts render
- CTAs reflect user state

## Phase 6: Gated Downloads & Download Logging

**Goal:** Logged-in subscribers can download files and every request is attributed.

### 6.1 — Storage

- `/lib/storage/local.ts`
- `getFileBuffer(downloadPath)`
- `fileExists(downloadPath)`
- `/lib/storage/index.ts` re-exports local implementation

### 6.2 — Entitlement Check

- `/lib/entitlements/evaluate.ts`
- `evaluateDownloadAccess(userId, fontWeightId)`:
  - require active entitlement
  - load font weight
  - check format against `allowed_formats`
  - no exception logic in MVP

### 6.3 — Download Route

- `/app/api/download/[fontWeightId]/route.ts`
- Flow:
  - require auth
  - evaluate access
  - deny with 403 if needed
  - generate request token hash
  - insert `download_requested` with captured IDs and format
  - read file from disk
  - return attachment response
- `signed_url_hash` column stores the request token hash in MVP for schema continuity

### 6.4 — Buttons

- Wire detail page buttons to download route
- Add loading and error states

### Checkpoint

- Subscribers can download
- Non-subscribers are denied
- Downloads are logged immutably

## Phase 7: Admin CLI Scripts

**Goal:** Admin ops are terminal-driven only in MVP.

### 7.1 — Audit Helper

- `/lib/admin/audit.ts`
- `logAdminAction({ adminUserId, action, targetType, targetId, details })`
- `details` contains before/after and optional reason

### 7.2 — CLI Scripts

- `/scripts/admin/lookup-user.ts <email>`
- `/scripts/admin/revoke-access.ts <userId> <reason>`
- `/scripts/admin/restore-access.ts <userId> <reason>`
- `/scripts/admin/export-downloads.ts <foundryId> <startDate> <endDate>`
- `/scripts/admin/delete-account.ts <userId>`
  - compute `anon_subject_id`
  - set `anon_subject_id`
  - null `user_id` on `download_requested`
  - delete user and cascaded records
  - log audit event

### 7.3 — Package Scripts

- Add:
  - `admin:lookup`
  - `admin:revoke`
  - `admin:restore`
  - `admin:export-downloads`
  - `admin:delete-account`

### Checkpoint

- CLI-only admin workflow works
- No admin web UI or admin API surface in MVP

## Phase 8: Integration Tests & Polish

**Goal:** High-risk paths are tested and the app is demo-ready.

### 8.1 — Test Infra

- Install Vitest
- Create test DB setup
- Add helpers for users, subscriptions, and catalog sync

### 8.2 — Critical Tests

- Entitlement check: active vs none vs wrong format
- Subscription flow: create, duplicate reject, cancel
- Download logging: correct captured IDs and request token hash
- Catalog sync idempotency: create, re-run, rename, deactivate
- Seed and sync independence
- Account anonymization: `anon_subject_id` set and `user_id` nulled

### 8.3 — Error Handling

- API routes return correct status codes
- Missing file handling
- Invalid/expired login link handling
- Already-subscribed handling

### 8.4 — UI Polish

- Strong visual design
- Responsive layout
- Loading/error/success states
- 404 page
- Basic SEO

### Checkpoint

- Tests pass
- UI is polished
- Local MVP is demoable

## Production Cutover Checklist

- **Database:** point `DATABASE_URL` to managed Postgres and run migrations
- **CMS:** add `sanity.ts`, schemas, and webhook-driven sync
- **Downloads:** add `r2.ts`, upload assets, switch download route to signed redirect
- **Payments:** add `stripe.ts`, webhook handling, and identity propagation
- **Email:** replace dev transport, remove bypass
- **Admin MFA:** add TOTP for admin role
- **Preview hosting:** move preview base URL to R2 public path
- **Entitlement exceptions:** add format override logic when needed
- **Monitoring:** add Sentry and uptime checks
- **Reconciliation + royalties:** build only when needed
- **Admin UI:** add only when CLI stops being sufficient

## Script Reference

- `docker compose up -d`
- `docker compose down`
- `npm run migrate`
- `npm run sync`
- `npm run seed`
- `npm run setup`
- `npm run dev`
- `npm run test`
- `npm run admin:lookup <email>`
- `npm run admin:revoke <userId> <reason>`
- `npm run admin:restore <userId> <reason>`
- `npm run admin:delete-account <userId>`
- `npm run admin:export-downloads <foundryId> <start> <end>`

## Assumptions

- MVP admin tooling is CLI-only; there are no admin pages or admin API endpoints yet.
- Preview files are served directly from `/public/fonts/previews/` and that directory is the canonical preview source for MVP.
- Entitlement exceptions, royalty snapshots, and reconciliation are intentionally deferred until a real business need appears.
- Production cutover still involves implementation work; the local architecture only reduces rewrite risk.

