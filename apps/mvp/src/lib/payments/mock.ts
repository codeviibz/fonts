import { randomUUID } from "node:crypto";
import { pool } from "@/lib/db/client";

export interface CreateSubscriptionResult {
  subscriptionId: string;
  entitlementId: string;
}

export async function createMockSubscription(
  userId: number
): Promise<CreateSubscriptionResult> {
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const mockCustomerId = `mock_cus_${randomUUID().slice(0, 8)}`;
  const mockSubscriptionId = `mock_sub_${randomUUID().slice(0, 8)}`;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Serialize checkout attempts for a single user.
    await client.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [userId]);

    const existing = await client.query<{ id: string }>(
      "SELECT id FROM subscriptions WHERE user_id = $1 AND status = 'active' LIMIT 1",
      [userId]
    );
    if (existing.rows[0]) {
      throw new PaymentError("User already has an active subscription");
    }

    const subResult = await client.query<{ id: string }>(
      `INSERT INTO subscriptions
         (user_id, stripe_customer_id, stripe_subscription_id, plan, status,
          current_period_start, current_period_end)
       VALUES ($1, $2, $3, 'pro', 'active', $4, $5)
       RETURNING id`,
      [userId, mockCustomerId, mockSubscriptionId, now, periodEnd]
    );
    const subscriptionId = subResult.rows[0].id;

    const entResult = await client.query<{ id: string }>(
      `INSERT INTO entitlements
         (user_id, subscription_id, type, status, allowed_formats)
       VALUES ($1, $2, 'full_catalog', 'active', '{otf,ttf,woff2}')
       RETURNING id`,
      [userId, subscriptionId]
    );
    const entitlementId = entResult.rows[0].id;

    await client.query("COMMIT");
    return { subscriptionId, entitlementId };
  } catch (err) {
    await client.query("ROLLBACK");
    if (isUniqueViolation(err)) {
      throw new PaymentError("User already has an active subscription");
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function cancelMockSubscription(userId: number): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const subResult = await client.query<{ id: string }>(
      `SELECT id FROM subscriptions
       WHERE user_id = $1 AND status = 'active'
       LIMIT 1
       FOR UPDATE`,
      [userId]
    );
    const subscription = subResult.rows[0];
    if (!subscription) {
      throw new PaymentError("No active subscription to cancel");
    }

    await client.query(
      `UPDATE subscriptions SET status = 'cancelled', updated_at = now() WHERE id = $1`,
      [subscription.id]
    );

    await client.query(
      `UPDATE entitlements
       SET status = 'cancelled', updated_at = now()
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export class PaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentError";
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23505";
}
