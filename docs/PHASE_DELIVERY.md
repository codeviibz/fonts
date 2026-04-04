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

## Phase 7 — Admin CLI Scripts

- Status: Shipped
- Scope:
  - Shared CLI helpers (`scripts/admin/_shared.ts`): input validation (`parseUserId`, `parseRequiredText`, `parseIsoDate`), admin actor authentication (`getAdminActorId`, `assertAdminActor`), centralized audit logging (`logAdminAudit`), and deterministic anonymization (`computeAnonSubjectId`).
  - `lookup-user.ts <email>` — read-only user/subscription/entitlement/download summary.
  - `revoke-access.ts <userId> <reason>` — transactionally cancels active subscriptions and revokes entitlements; requires `ADMIN_USER_ID`.
  - `restore-access.ts <userId> <reason>` — reactivates or creates subscription+entitlement; handles "already active" as an audited no-op; requires `ADMIN_USER_ID`.
  - `export-downloads.ts <foundryId> <startDate> <endDate>` — exports TSV with foundry-scoped download data.
  - `delete-account.ts <userId>` — anonymizes download records, cascading-deletes user; prevents self-deletion; requires `ADMIN_USER_ID`.
  - Runtime audit helper at `src/lib/admin/audit.ts` (`logAdminAction`) for future web-based admin operations.
- Security / integrity hardening:
  - All mutating scripts require `ADMIN_USER_ID` env var; actor role is verified against DB before any mutation.
  - `process.exit()` replaced with thrown errors inside `try` blocks to ensure `ROLLBACK` + `client.release()` in `catch`/`finally`.
  - `delete-account` prevents deletion of the admin actor's own account (avoids FK violation on audit log).
  - Input validation rejects non-integer user IDs, empty strings, and malformed dates.
- Validation:
  - Typecheck and lint pass.
  - Smoke: `lookup-user` displays user data; `revoke-access` cancels subscriptions/entitlements; `restore-access` reactivates and handles idempotent no-op; `export-downloads` outputs TSV; `delete-account` self-protection rejects; all audit entries correctly attributed to admin actor with well-formed JSON details.
  - Error cases: missing `ADMIN_USER_ID` exits with clear error; invalid `userId` rejected; nonexistent user rejected.

## Phase 8 — Integration Tests & Polish

- Status: Shipped
- Scope:
  - Added Vitest-based integration test infrastructure with DB-backed setup (`vitest.config.ts`, `tests/setup.ts`, `tests/helpers/db.ts`).
  - Added critical high-risk test coverage:
    - Entitlement checks: active vs no entitlement vs invalid format.
    - Subscription lifecycle: create, duplicate reject, cancel.
    - Download logging persistence: captured IDs and request hash integrity.
    - Catalog sync idempotency and deactivate-on-missing behavior.
    - Seed/sync independence guarantees.
    - Account anonymization: `anon_subject_id` set and `user_id` / `entitlement_id` nulled on delete.
  - Added auth error UX page for invalid/expired magic links (`/auth-error`) and wired NextAuth `pages.error`.
  - Added app-wide custom 404 page (`src/app/not-found.tsx`).
  - Upgraded root metadata defaults for basic SEO/social sharing (`title` template, Open Graph, Twitter card).
- Security / integrity hardening:
  - Fixed `delete-account.ts` to also null `download_requested.entitlement_id` during anonymization, preventing FK violations when cascading entitlements on user deletion.
  - Added regression test to lock this behavior.
- Validation:
  - `npm -w @fonts/mvp run test` passes (5 files / 9 tests).
  - `npm -w @fonts/mvp run typecheck` passes.
  - `npm -w @fonts/mvp run lint` passes.

## Forward Process (For All Future Phases)

For every future phase push, update this file with:

- Status and scope summary.
- Any security or data-integrity hardening changes.
- Validation evidence (type/lint/build/smoke and key edge cases).
- Known gaps and deferred follow-ups.
