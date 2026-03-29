// Row types mirroring Postgres tables.
// Column names use snake_case to match the DB; quoted columns preserve their
// original camelCase (e.g. "emailVerified", "sessionToken").

export interface DbUser {
  id: number;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  role: "subscriber" | "admin";
  created_at: Date;
  updated_at: Date;
}

export interface DbAccount {
  id: number;
  userId: number;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: number | null;
  id_token: string | null;
  scope: string | null;
  session_state: string | null;
  token_type: string | null;
}

export interface DbSession {
  id: number;
  userId: number;
  expires: Date;
  sessionToken: string;
}

export interface DbVerificationToken {
  identifier: string;
  expires: Date;
  token: string;
}

// ── Catalog ────────────────────────────────────────────────

export interface DbFoundry {
  id: string;
  sanity_document_id: string;
  name: string;
  slug: string;
  url: string | null;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DbFontFamily {
  id: string;
  sanity_document_id: string;
  foundry_id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  styles: string[];
  moods: string[];
  use_cases: string[];
  featured: boolean;
  qa_status: "draft" | "approved" | "published";
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DbFontWeight {
  id: string;
  sanity_document_id: string;
  family_id: string;
  name: string;
  slug: string;
  weight: number;
  style: "normal" | "italic";
  preview_path: string | null;
  download_path: string | null;
  allowed_formats: string[];
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

// ── Subscriptions & Entitlements ───────────────────────────

export type SubscriptionStatus = "active" | "cancelled" | "past_due" | "expired";
export type EntitlementStatus = "active" | "cancelled" | "revoked";

export interface DbSubscription {
  id: string;
  user_id: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: string;
  status: SubscriptionStatus;
  current_period_start: Date | null;
  current_period_end: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface DbEntitlement {
  id: string;
  user_id: number;
  subscription_id: string;
  type: string;
  status: EntitlementStatus;
  allowed_formats: string[];
  created_at: Date;
  updated_at: Date;
}

// ── Download Tracking ──────────────────────────────────────

export interface DbDownloadRequested {
  id: string;
  user_id: number | null;
  anon_subject_id: string | null;
  font_weight_id: string;
  font_family_id: string;
  foundry_id: string;
  entitlement_id: string | null;
  format: string;
  signed_url_hash: string;
  requested_at: Date;
  ip_address: string | null;
  user_agent: string | null;
}

// ── Admin Audit ────────────────────────────────────────────

export interface DbAdminAuditLog {
  id: string;
  admin_user_id: number;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: Date;
}
