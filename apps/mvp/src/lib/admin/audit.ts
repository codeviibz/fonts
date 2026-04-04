import { pool } from "@/lib/db/client";
import type { DbAdminAuditLog } from "@/types/database";

export interface LogAdminActionParams {
  adminUserId: number;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
}

export async function logAdminAction(
  params: LogAdminActionParams
): Promise<DbAdminAuditLog> {
  const result = await pool.query<DbAdminAuditLog>(
    `INSERT INTO admin_audit_log
       (admin_user_id, action, target_type, target_id, details)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      params.adminUserId,
      params.action,
      params.targetType,
      params.targetId,
      JSON.stringify(params.details ?? {}),
    ]
  );
  return result.rows[0];
}
