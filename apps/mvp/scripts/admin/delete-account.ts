import { Pool } from "pg";
import { createHash } from "node:crypto";
import {
  assertAdminActor,
  computeAnonSubjectId,
  getAdminActorId,
  logAdminAudit,
  parseUserId,
} from "./_shared";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const userId = process.argv[2];
if (!userId) {
  console.error("Usage: delete-account.ts <userId>");
  console.error("  Requires ADMIN_USER_ID=<admin-user-id>");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  const adminUserId = getAdminActorId();
  const userIdNum = parseUserId(userId, "userId");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await assertAdminActor(client, adminUserId);

    const user = await client.query(
      "SELECT id, email, name, role FROM users WHERE id = $1 FOR UPDATE",
      [userIdNum]
    );
    if (user.rows.length === 0) {
      throw new Error(`User ${userId} not found`);
    }
    if (adminUserId === userIdNum) {
      throw new Error("Refusing to delete the same user as ADMIN_USER_ID");
    }

    const { email, role } = user.rows[0];
    const anonSubjectId = computeAnonSubjectId(userIdNum);

    const dlUpdate = await client.query(
      `UPDATE download_requested
       SET anon_subject_id = $1, user_id = NULL, entitlement_id = NULL
       WHERE user_id = $2
       RETURNING id`,
      [anonSubjectId, userIdNum]
    );

    const subsCount = await client.query(
      "SELECT COUNT(*) as count FROM subscriptions WHERE user_id = $1",
      [userIdNum]
    );
    const entsCount = await client.query(
      "SELECT COUNT(*) as count FROM entitlements WHERE user_id = $1",
      [userIdNum]
    );

    await logAdminAudit(client, {
      adminUserId,
      action: "delete_account",
      targetType: "user",
      targetId: String(userIdNum),
      details: {
        email_hash: createHash("sha256").update(email ?? "").digest("hex").slice(0, 12),
        role,
        anon_subject_id: anonSubjectId,
        downloads_anonymized: dlUpdate.rowCount,
        subscriptions_deleted: Number(subsCount.rows[0].count),
        entitlements_deleted: Number(entsCount.rows[0].count),
      },
    });

    // Cascades: sessions, accounts, subscriptions, entitlements
    await client.query("DELETE FROM users WHERE id = $1", [userIdNum]);

    await client.query("COMMIT");

    console.log(`\nAccount deleted for user ${userId} (${email})`);
    console.log(`  Anon subject ID:       ${anonSubjectId}`);
    console.log(`  Downloads anonymized:  ${dlUpdate.rowCount}`);
    console.log(`  Subscriptions deleted: ${subsCount.rows[0].count} (cascaded)`);
    console.log(`  Entitlements deleted:  ${entsCount.rows[0].count} (cascaded)`);
    console.log(`  Audit log entry created.\n`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

main()
  .catch((err) => {
    console.error("Delete failed:", err);
    process.exit(1);
  })
  .finally(() => pool.end());
