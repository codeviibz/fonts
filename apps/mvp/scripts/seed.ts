import { Pool } from "pg";
import { v5 as uuidv5 } from "uuid";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

// Deterministic UUID namespace for seed data
const SEED_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

function seedUuid(label: string): string {
  return uuidv5(label, SEED_NAMESPACE);
}

const USERS = [
  {
    email: "admin@test.com",
    name: "Admin User",
    role: "admin" as const,
  },
  {
    email: "user@test.com",
    name: "Subscribed User",
    role: "subscriber" as const,
  },
  {
    email: "free@test.com",
    name: "Free User",
    role: "subscriber" as const,
  },
];

async function ensureActiveSubscription(userId: number, email: string): Promise<string> {
  const deterministicSubId = seedUuid(`sub:${email}`);
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const existing = await pool.query<{ id: string }>(
    `SELECT id
     FROM subscriptions
     WHERE user_id = $1 AND status = 'active'
     ORDER BY created_at ASC
     LIMIT 1`,
    [userId]
  );

  const activeSubId = existing.rows[0]?.id ?? deterministicSubId;

  if (existing.rows[0]) {
    await pool.query(
      `UPDATE subscriptions
       SET stripe_customer_id = $2,
           stripe_subscription_id = $3,
           plan = $4,
           status = 'active',
           current_period_start = $5,
           current_period_end = $6,
           updated_at = now()
       WHERE id = $1`,
      [activeSubId, "mock_cus_001", "mock_sub_001", "pro", now, periodEnd]
    );
  } else {
    await pool.query(
      `INSERT INTO subscriptions (id, user_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_start, current_period_end)
       VALUES ($1, $2, $3, $4, $5, 'active', $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         user_id = $2,
         stripe_customer_id = $3,
         stripe_subscription_id = $4,
         plan = $5,
         status = 'active',
         current_period_start = $6,
         current_period_end = $7,
         updated_at = now()`,
      [activeSubId, userId, "mock_cus_001", "mock_sub_001", "pro", now, periodEnd]
    );
  }

  await pool.query(
    `UPDATE subscriptions
     SET status = 'cancelled',
         updated_at = now()
     WHERE user_id = $1
       AND status = 'active'
       AND id <> $2`,
    [userId, activeSubId]
  );

  return activeSubId;
}

async function ensureActiveEntitlement(userId: number, email: string, subscriptionId: string): Promise<string> {
  const deterministicEntitlementId = seedUuid(`ent:${email}`);
  const existing = await pool.query<{ id: string }>(
    `SELECT id
     FROM entitlements
     WHERE user_id = $1 AND status = 'active'
     ORDER BY created_at ASC
     LIMIT 1`,
    [userId]
  );

  const activeEntitlementId = existing.rows[0]?.id ?? deterministicEntitlementId;

  if (existing.rows[0]) {
    await pool.query(
      `UPDATE entitlements
       SET subscription_id = $2,
           type = 'full_catalog',
           status = 'active',
           allowed_formats = '{otf,ttf,woff2}',
           updated_at = now()
       WHERE id = $1`,
      [activeEntitlementId, subscriptionId]
    );
  } else {
    await pool.query(
      `INSERT INTO entitlements (id, user_id, subscription_id, type, status)
       VALUES ($1, $2, $3, 'full_catalog', 'active')
       ON CONFLICT (id) DO UPDATE SET
         user_id = $2,
         subscription_id = $3,
         type = 'full_catalog',
         status = 'active',
         updated_at = now()`,
      [activeEntitlementId, userId, subscriptionId]
    );
  }

  await pool.query(
    `UPDATE entitlements
     SET status = 'cancelled',
         updated_at = now()
     WHERE user_id = $1
       AND status = 'active'
       AND id <> $2`,
    [userId, activeEntitlementId]
  );

  return activeEntitlementId;
}

async function main() {
  console.log("Seeding users, subscriptions, and entitlements...\n");

  try {
    for (const u of USERS) {
      const result = await pool.query(
        `INSERT INTO users (name, email, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE SET name = $1, role = $3
         RETURNING id`,
        [u.name, u.email, u.role]
      );
      const userId = result.rows[0].id as number;
      console.log(`  user  ${u.email} (id=${userId}, role=${u.role})`);

      if (u.email === "user@test.com") {
        const subId = await ensureActiveSubscription(userId, u.email);
        console.log(`  sub   ${subId} (active, mock_sub_001)`);

        const entId = await ensureActiveEntitlement(userId, u.email, subId);
        console.log(`  ent   ${entId} (active, full_catalog)`);
      }
    }

    console.log("\nSeed complete.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
