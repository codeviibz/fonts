import { createHash } from "node:crypto";
import type { PoolClient } from "pg";

export function parseUserId(raw: string | undefined, label: string): number {
  if (!raw) {
    throw new Error(`Missing ${label}`);
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid ${label}: ${raw}`);
  }
  return value;
}

export function parseRequiredText(raw: string | undefined, label: string): string {
  const value = raw?.trim();
  if (!value) {
    throw new Error(`Missing ${label}`);
  }
  return value;
}

export function parseIsoDate(raw: string | undefined, label: string): string {
  const value = parseRequiredText(raw, label);
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (!valid) {
    throw new Error(`Invalid ${label}: ${value}. Expected YYYY-MM-DD`);
  }
  return value;
}

export function getAdminActorId(): number {
  return parseUserId(process.env.ADMIN_USER_ID, "ADMIN_USER_ID");
}

export async function assertAdminActor(
  client: PoolClient,
  adminUserId: number
): Promise<void> {
  const result = await client.query<{ id: number; role: string }>(
    "SELECT id, role FROM users WHERE id = $1",
    [adminUserId]
  );
  if (result.rows.length === 0) {
    throw new Error(`Admin actor user ${adminUserId} not found`);
  }
  if (result.rows[0].role !== "admin") {
    throw new Error(`User ${adminUserId} is not an admin`);
  }
}

interface AuditParams {
  adminUserId: number;
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, unknown>;
}

export async function logAdminAudit(
  client: PoolClient,
  params: AuditParams
): Promise<void> {
  await client.query(
    `INSERT INTO admin_audit_log (admin_user_id, action, target_type, target_id, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      params.adminUserId,
      params.action,
      params.targetType,
      params.targetId,
      JSON.stringify(params.details),
    ]
  );
}

export function computeAnonSubjectId(userId: number): string {
  return createHash("sha256")
    .update(`user:${userId}:${Date.now()}`)
    .digest("hex")
    .slice(0, 16);
}

