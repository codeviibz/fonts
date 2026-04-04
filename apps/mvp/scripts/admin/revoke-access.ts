import { Pool } from "pg";
import { assertAdminActor, getAdminActorId, logAdminAudit, parseUserId } from "./_shared";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const userId = process.argv[2];
const reason = process.argv.slice(3).join(" ").trim() || "No reason provided";

if (!userId) {
  console.error("Usage: revoke-access.ts <userId> <reason>");
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
      "SELECT id, email, role FROM users WHERE id = $1",
      [userIdNum]
    );
    if (user.rows.length === 0) {
      throw new Error(`User ${userId} not found`);
    }

    const subsBefore = await client.query(
      "SELECT id, status FROM subscriptions WHERE user_id = $1 AND status = 'active'",
      [userIdNum]
    );
    const entsBefore = await client.query(
      "SELECT id, status FROM entitlements WHERE user_id = $1 AND status = 'active'",
      [userIdNum]
    );

    const subResult = await client.query(
      `UPDATE subscriptions SET status = 'cancelled', updated_at = now()
       WHERE user_id = $1 AND status = 'active'
       RETURNING id`,
      [userIdNum]
    );

    const entResult = await client.query(
      `UPDATE entitlements SET status = 'revoked', updated_at = now()
       WHERE user_id = $1 AND status = 'active'
       RETURNING id`,
      [userIdNum]
    );

    await logAdminAudit(client, {
      adminUserId,
      action: "revoke_access",
      targetType: "user",
      targetId: String(userIdNum),
      details: {
        reason,
        subscriptions_cancelled: subResult.rows.map((r: { id: string }) => r.id),
        entitlements_revoked: entResult.rows.map((r: { id: string }) => r.id),
        before: {
          active_subscriptions: subsBefore.rows.length,
          active_entitlements: entsBefore.rows.length,
        },
      },
    });

    await client.query("COMMIT");

    console.log(`\nRevoked access for user ${userId} (${user.rows[0].email})`);
    console.log(`  Subscriptions cancelled: ${subResult.rowCount}`);
    console.log(`  Entitlements revoked:    ${entResult.rowCount}`);
    console.log(`  Reason: ${reason}\n`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

main()
  .catch((err) => {
    console.error("Revoke failed:", err);
    process.exit(1);
  })
  .finally(() => pool.end());
