import { createHash, randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { logDownloadRequest } from "@/lib/db/queries";
import { getActiveWeightId, getFoundryIdForWeight, getUserIdByEmail, testPool } from "./helpers/db";

describe("download logging", () => {
  it("stores immutable attribution fields and request hash", async () => {
    const userId = await getUserIdByEmail("user@test.com");
    const weightId = await getActiveWeightId();
    const foundryId = await getFoundryIdForWeight(weightId);

    const relation = await testPool.query<{ family_id: string }>(
      "SELECT family_id FROM font_weights WHERE id = $1",
      [weightId]
    );
    const entitlement = await testPool.query<{ id: string }>(
      "SELECT id FROM entitlements WHERE user_id = $1 AND status = 'active' LIMIT 1",
      [userId]
    );

    const requestToken = randomUUID();
    const signedUrlHash = createHash("sha256").update(requestToken).digest("hex");

    const row = await logDownloadRequest({
      userId,
      fontWeightId: weightId,
      fontFamilyId: relation.rows[0].family_id,
      foundryId,
      entitlementId: entitlement.rows[0].id,
      format: "otf",
      signedUrlHash,
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    });

    try {
      expect(row.user_id).toBe(userId);
      expect(row.font_weight_id).toBe(weightId);
      expect(row.signed_url_hash).toBe(signedUrlHash);
      expect(row.signed_url_hash).toHaveLength(64);
    } finally {
      await testPool.query("DELETE FROM download_requested WHERE id = $1", [row.id]);
    }
  });
});
