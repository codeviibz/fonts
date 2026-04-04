import { describe, expect, it } from "vitest";
import { cancelMockSubscription, createMockSubscription, PaymentError } from "@/lib/payments";
import { createTempUser, testPool } from "./helpers/db";

describe("mock subscription flow", () => {
  it("creates, rejects duplicate, and cancels a subscription", async () => {
    const user = await createTempUser("subscription-flow");
    try {
      const created = await createMockSubscription(user.id);
      expect(created.subscriptionId).toBeTruthy();
      expect(created.entitlementId).toBeTruthy();

      await expect(createMockSubscription(user.id)).rejects.toBeInstanceOf(PaymentError);

      await cancelMockSubscription(user.id);

      const statusResult = await testPool.query<{ status: string }>(
        "SELECT status FROM subscriptions WHERE id = $1",
        [created.subscriptionId]
      );
      expect(statusResult.rows[0]?.status).toBe("cancelled");
    } finally {
      await testPool.query("DELETE FROM users WHERE id = $1", [user.id]);
    }
  });
});
