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
  console.error("Usage: restore-access.ts <userId> <reason>");
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

    const existingActive = await client.query(
      "SELECT id FROM subscriptions WHERE user_id = $1 AND status = 'active' LIMIT 1",
      [userIdNum]
    );
    if (existingActive.rows.length > 0) {
      await logAdminAudit(client, {
        adminUserId,
        action: "restore_access_noop",
        targetType: "user",
        targetId: String(userIdNum),
        details: {
          reason,
          note: "User already had active subscription",
        },
      });
      await client.query("COMMIT");
      console.log(`User ${userId} already has an active subscription. No changes made.`);
      return;
    }

    const lastSub = await client.query(
      `SELECT id FROM subscriptions WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [userIdNum]
    );

    let restoredSubId: string | null = null;
    let restoredEntId: string | null = null;
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (lastSub.rows.length > 0) {
      restoredSubId = lastSub.rows[0].id;
      await client.query(
        `UPDATE subscriptions
         SET status = 'active', current_period_start = $2, current_period_end = $3, updated_at = now()
         WHERE id = $1`,
        [restoredSubId, now, periodEnd]
      );

      const lastEnt = await client.query(
        `SELECT id FROM entitlements WHERE subscription_id = $1
         ORDER BY created_at DESC LIMIT 1`,
        [restoredSubId]
      );

      if (lastEnt.rows.length > 0) {
        restoredEntId = lastEnt.rows[0].id;
        await client.query(
          `UPDATE entitlements SET status = 'active', updated_at = now() WHERE id = $1`,
          [restoredEntId]
        );
      } else {
        const entResult = await client.query(
          `INSERT INTO entitlements (user_id, subscription_id, type, status)
           VALUES ($1, $2, 'full_catalog', 'active')
           RETURNING id`,
          [userIdNum, restoredSubId]
        );
        restoredEntId = entResult.rows[0].id;
      }
    } else {
      const subResult = await client.query(
        `INSERT INTO subscriptions (user_id, plan, status, current_period_start, current_period_end,
           stripe_customer_id, stripe_subscription_id)
         VALUES ($1, 'pro', 'active', $2, $3, 'restored_manual', 'restored_manual')
         RETURNING id`,
        [userIdNum, now, periodEnd]
      );
      restoredSubId = subResult.rows[0].id;

      const entResult = await client.query(
        `INSERT INTO entitlements (user_id, subscription_id, type, status)
         VALUES ($1, $2, 'full_catalog', 'active')
         RETURNING id`,
        [userIdNum, restoredSubId]
      );
      restoredEntId = entResult.rows[0].id;
    }

    await logAdminAudit(client, {
      adminUserId,
      action: "restore_access",
      targetType: "user",
      targetId: String(userIdNum),
      details: {
        reason,
        subscription_id: restoredSubId,
        entitlement_id: restoredEntId,
      },
    });

    await client.query("COMMIT");

    console.log(`\nRestored access for user ${userId} (${user.rows[0].email})`);
    console.log(`  Subscription: ${restoredSubId}`);
    console.log(`  Entitlement:  ${restoredEntId}`);
    console.log(`  Period:       ${now.toISOString().slice(0, 10)} → ${periodEnd.toISOString().slice(0, 10)}`);
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
    console.error("Restore failed:", err);
    process.exit(1);
  })
  .finally(() => pool.end());
