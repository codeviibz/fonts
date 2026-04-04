import { describe, expect, it } from "vitest";
import { createTempUser, getActiveWeightId, getFoundryIdForWeight, runScript, testPool } from "./helpers/db";

describe("account anonymization", () => {
  it("sets anon_subject_id and nulls user_id when deleting an account", async () => {
    const user = await createTempUser("delete-account");
    const weightId = await getActiveWeightId();
    const foundryId = await getFoundryIdForWeight(weightId);

    const family = await testPool.query<{ family_id: string }>(
      "SELECT family_id FROM font_weights WHERE id = $1",
      [weightId]
    );

    const subscription = await testPool.query<{ id: string }>(
      `INSERT INTO subscriptions (user_id, plan, status, stripe_customer_id, stripe_subscription_id)
       VALUES ($1, 'pro', 'active', 'mock_cus_test', 'mock_sub_test')
       RETURNING id`,
      [user.id]
    );

    const entitlement = await testPool.query<{ id: string }>(
      `INSERT INTO entitlements (user_id, subscription_id, type, status)
       VALUES ($1, $2, 'full_catalog', 'active')
       RETURNING id`,
      [user.id, subscription.rows[0].id]
    );

    const download = await testPool.query<{ id: string }>(
      `INSERT INTO download_requested
         (user_id, font_weight_id, font_family_id, foundry_id, entitlement_id, format, signed_url_hash)
       VALUES ($1, $2, $3, $4, $5, 'otf', repeat('a', 64))
       RETURNING id`,
      [user.id, weightId, family.rows[0].family_id, foundryId, entitlement.rows[0].id]
    );

    await runScript(
      "scripts/admin/delete-account.ts",
      { ADMIN_USER_ID: "1" },
      [String(user.id)]
    );

    const userAfter = await testPool.query("SELECT id FROM users WHERE id = $1", [user.id]);
    expect(userAfter.rowCount).toBe(0);

    const downloadAfter = await testPool.query<{
      user_id: number | null;
      entitlement_id: string | null;
      anon_subject_id: string | null;
    }>(
      "SELECT user_id, entitlement_id, anon_subject_id FROM download_requested WHERE id = $1",
      [download.rows[0].id]
    );

    expect(downloadAfter.rows[0].user_id).toBeNull();
    expect(downloadAfter.rows[0].entitlement_id).toBeNull();
    expect(downloadAfter.rows[0].anon_subject_id).toBeTruthy();
  });
});
