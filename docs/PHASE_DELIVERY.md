# Phase Delivery Log

This file tracks what was shipped for each phase, the validation performed, and any follow-up notes.

## Phase 1 — Database, Types, Seed

- Status: Shipped
- Scope:
  - Core schema migration and migration runner.
  - DB client and query helpers.
  - Deterministic seed data for admin/subscribed/free users.
- Validation:
  - Migration and seed scripts run successfully.
  - Build/type checks completed.

## Phase 2 — Local Font Catalog

- Status: Shipped
- Scope:
  - JSON catalog source files for foundries/families/weights.
  - Catalog loader functions.
  - Idempotent sync script with upsert/deactivate behavior.
- Validation:
  - Sync script runs and is repeatable.
  - Catalog data available to app pages.

## Phase 3 — Authentication (Dev Mode)

- Status: Shipped
- Scope:
  - NextAuth v4 with Postgres adapter and database sessions.
  - Login/verify routes, dev-login bypass route, session helpers.
  - Middleware admin protection and auth-related rate limiting.
- Validation:
  - Login/session behavior smoke tested.
  - Middleware and auth guards manually verified.

## Phase 4 — Mock Payments & Subscription Management

- Status: Shipped
- Scope:
  - Mock checkout/cancel service with transactional consistency.
  - API routes for subscribe/cancel.
  - Subscribe page with auth/subscription UI states.
- Validation:
  - Type/build/lint checks pass.
  - API smoke tests pass including duplicate and concurrent checkout cases.

## Phase 5 — Public Catalog & Font Detail Pages

- Status: Shipped
- Scope:
  - Public `/fonts` catalog page and client-side filtering (style, mood, use case).
  - `/fonts/[slug]` detail page with specimen controls, mockups, weights, tags, foundry metadata.
  - Preview font loading via `FontFace` with `font-display: swap`.
  - Shared nav + upgraded home page with featured fonts and browse CTA.
  - Hardening updates from review:
    - DB `is_active` cross-reference for catalog/detail when DB is available.
    - Strict fallback behavior only for local missing `DATABASE_URL`.
    - Catalog mockup thumbnail support.
    - Nav semantics fix (no nested interactive elements).
- Validation:
  - Typecheck and lint pass.
  - Smoke tests: `/` 200, `/fonts` 200, `/fonts/[slug]` 200, invalid slug 404.

## Phase 6 — Gated Downloads & Download Logging

- Status: Shipped
- Scope:
  - Local file storage helpers under `data/font-files/downloads` (`getFileBuffer`, `fileExists`).
  - `evaluateDownloadAccess(userId, fontWeightId, format)` — active entitlement, active weight with `download_path`, and allowed formats as the **intersection** of entitlement and weight `allowed_formats` (case-insensitive).
  - `GET /api/download/[fontWeightId]?format=` — requires auth, evaluates access, inserts `download_requested` (with `signed_url_hash` for schema continuity), streams attachment with appropriate `Content-Type` and `Cache-Control: private, no-cache`.
  - Font detail page resolves DB weight UUIDs from JSON `sanity_document_id` via `getWeightIdsBySanityIds`; per-weight download buttons with loading and error states.
- Security / data-integrity hardening:
  - Path traversal guard: resolved download paths must stay under the downloads root (rejects `..`, empty path, and absolute escapes).
  - Catalog/detail `shouldFallbackToJson` only when **non-production**, `DATABASE_URL` is unset, and the error is specifically the missing-URL pool init — production builds require a configured database.
- Validation:
  - Typecheck and lint pass.
  - Smoke: unauthenticated download 401; no/cancelled entitlement 403; invalid weight 403; disallowed format 403; successful download 200 when file exists on disk; row present in `download_requested`.
  - Operational: if `localhost:3000` returns 500 with `Cannot find module './NNN.js'` or webpack cache ENOENT, stop the dev server, remove `apps/mvp/.next`, and restart (stale cache after interrupted build).

## Forward Process (For All Future Phases)

For every future phase push, update this file with:

- Status and scope summary.
- Any security or data-integrity hardening changes.
- Validation evidence (type/lint/build/smoke and key edge cases).
- Known gaps and deferred follow-ups.
