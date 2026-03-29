import { pool } from "./client";
import type {
  DbUser,
  DbSubscription,
  DbEntitlement,
  DbFontWeight,
  DbFontFamily,
  DbFoundry,
} from "@/types/database";

// ── Users ──────────────────────────────────────────────────

export async function getUserById(id: number): Promise<DbUser | null> {
  const result = await pool.query<DbUser>(
    "SELECT * FROM users WHERE id = $1",
    [id]
  );
  return result.rows[0] ?? null;
}

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const result = await pool.query<DbUser>(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );
  return result.rows[0] ?? null;
}

// ── Subscriptions ──────────────────────────────────────────

export async function getActiveSubscription(
  userId: number
): Promise<DbSubscription | null> {
  const result = await pool.query<DbSubscription>(
    "SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'active' LIMIT 1",
    [userId]
  );
  return result.rows[0] ?? null;
}

// ── Entitlements ───────────────────────────────────────────

export async function getActiveEntitlement(
  userId: number
): Promise<DbEntitlement | null> {
  const result = await pool.query<DbEntitlement>(
    "SELECT * FROM entitlements WHERE user_id = $1 AND status = 'active' LIMIT 1",
    [userId]
  );
  return result.rows[0] ?? null;
}

// ── Catalog ────────────────────────────────────────────────

export async function getActiveFontFamilies(): Promise<DbFontFamily[]> {
  const result = await pool.query<DbFontFamily>(
    `SELECT * FROM font_families
     WHERE is_active = true AND qa_status = 'published'
     ORDER BY name`
  );
  return result.rows;
}

export async function getFontFamilyBySlug(
  slug: string
): Promise<DbFontFamily | null> {
  const result = await pool.query<DbFontFamily>(
    "SELECT * FROM font_families WHERE slug = $1 AND is_active = true",
    [slug]
  );
  return result.rows[0] ?? null;
}

export async function getFontWeightsByFamilyId(
  familyId: string
): Promise<DbFontWeight[]> {
  const result = await pool.query<DbFontWeight>(
    "SELECT * FROM font_weights WHERE family_id = $1 AND is_active = true ORDER BY sort_order, weight",
    [familyId]
  );
  return result.rows;
}

export async function getFontWeightById(
  id: string
): Promise<DbFontWeight | null> {
  const result = await pool.query<DbFontWeight>(
    "SELECT * FROM font_weights WHERE id = $1",
    [id]
  );
  return result.rows[0] ?? null;
}

export async function getFoundryById(
  id: string
): Promise<DbFoundry | null> {
  const result = await pool.query<DbFoundry>(
    "SELECT * FROM foundries WHERE id = $1",
    [id]
  );
  return result.rows[0] ?? null;
}

export async function getActiveFoundries(): Promise<DbFoundry[]> {
  const result = await pool.query<DbFoundry>(
    "SELECT * FROM foundries WHERE is_active = true ORDER BY name"
  );
  return result.rows;
}
