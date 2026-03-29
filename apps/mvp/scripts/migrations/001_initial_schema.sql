-- 001_initial_schema.sql
-- Phase 1: Auth.js pg-adapter tables + application domain tables
--
-- Auth section: exact schema required by @auth/pg-adapter.
-- Application section: custom tables for the font subscription platform.

BEGIN;

-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- AUTH TABLES (required by @auth/pg-adapter)
-- Do not modify column names, types, or PK strategy.
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  "emailVerified" TIMESTAMPTZ,
  image TEXT,
  -- Application extensions
  role TEXT NOT NULL DEFAULT 'subscriber' CHECK (role IN ('subscriber', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  "providerAccountId" VARCHAR(255) NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  id_token TEXT,
  scope TEXT,
  session_state TEXT,
  token_type TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_provider_provider_account_id
  ON accounts (provider, "providerAccountId");

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL,
  "sessionToken" VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS verification_token (
  identifier TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  token TEXT NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- ============================================================
-- CATALOG READ-MODEL TABLES
-- Populated exclusively by scripts/sync-catalog.ts from JSON.
-- ============================================================

CREATE TABLE IF NOT EXISTS foundries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sanity_document_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  url TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS font_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sanity_document_id TEXT UNIQUE NOT NULL,
  foundry_id UUID NOT NULL REFERENCES foundries(id),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT,
  styles TEXT[] NOT NULL DEFAULT '{}',
  moods TEXT[] NOT NULL DEFAULT '{}',
  use_cases TEXT[] NOT NULL DEFAULT '{}',
  featured BOOLEAN NOT NULL DEFAULT false,
  qa_status TEXT NOT NULL DEFAULT 'draft' CHECK (qa_status IN ('draft', 'approved', 'published')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS font_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sanity_document_id TEXT UNIQUE NOT NULL,
  family_id UUID NOT NULL REFERENCES font_families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  weight INTEGER NOT NULL,
  style TEXT NOT NULL DEFAULT 'normal' CHECK (style IN ('normal', 'italic')),
  preview_path TEXT,
  download_path TEXT,
  allowed_formats TEXT[] NOT NULL DEFAULT '{otf,ttf,woff2}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (family_id, slug)
);

-- ============================================================
-- SUBSCRIPTION & ENTITLEMENT TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL DEFAULT 'pro',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'expired')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One active subscription per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_one_active_per_user
  ON subscriptions (user_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'full_catalog',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'revoked')),
  allowed_formats TEXT[] NOT NULL DEFAULT '{otf,ttf,woff2}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One active entitlement per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlements_one_active_per_user
  ON entitlements (user_id) WHERE status = 'active';

-- ============================================================
-- DOWNLOAD TRACKING
-- ============================================================

CREATE TABLE IF NOT EXISTS download_requested (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  anon_subject_id TEXT,
  font_weight_id UUID NOT NULL REFERENCES font_weights(id),
  font_family_id UUID NOT NULL REFERENCES font_families(id),
  foundry_id UUID NOT NULL REFERENCES foundries(id),
  entitlement_id UUID REFERENCES entitlements(id),
  format TEXT NOT NULL,
  signed_url_hash TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_download_requested_user
  ON download_requested (user_id);
CREATE INDEX IF NOT EXISTS idx_download_requested_foundry_date
  ON download_requested (foundry_id, requested_at);

-- ============================================================
-- ADMIN AUDIT LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id INTEGER NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- FUTURE-ALIGNMENT TABLES (schema parity, unused in MVP)
-- ============================================================

CREATE TABLE IF NOT EXISTS entitlement_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entitlement_id UUID NOT NULL REFERENCES entitlements(id) ON DELETE CASCADE,
  font_family_id UUID REFERENCES font_families(id),
  font_weight_id UUID REFERENCES font_weights(id),
  exception_type TEXT NOT NULL CHECK (exception_type IN ('include', 'exclude', 'format_override')),
  allowed_formats TEXT[],
  reason TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS download_delivered (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  download_requested_id UUID NOT NULL REFERENCES download_requested(id),
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  file_size_bytes BIGINT,
  cdn_region TEXT
);

CREATE TABLE IF NOT EXISTS download_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  download_requested_id UUID NOT NULL REFERENCES download_requested(id),
  flag_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  flagged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS royalty_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foundry_id UUID NOT NULL REFERENCES foundries(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  download_count INTEGER NOT NULL DEFAULT 0,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MIGRATION TRACKING
-- ============================================================

CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  filename TEXT UNIQUE NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
