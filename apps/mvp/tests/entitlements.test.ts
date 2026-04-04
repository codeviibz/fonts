import { describe, expect, it } from "vitest";
import { evaluateDownloadAccess } from "@/lib/entitlements";
import { createTempUser, getActiveWeightId, getUserIdByEmail, testPool } from "./helpers/db";

describe("evaluateDownloadAccess", () => {
  it("allows an active subscriber with an allowed format", async () => {
    const userId = await getUserIdByEmail("user@test.com");
    const weightId = await getActiveWeightId();

    const result = await evaluateDownloadAccess(userId, weightId, "otf");

    expect(result.allowed).toBe(true);
    if (!result.allowed) return;
    expect(result.entitlement.status).toBe("active");
    expect(result.fontWeight.is_active).toBe(true);
  });

  it("denies a user without active entitlement", async () => {
    const user = await createTempUser("no-entitlement");
    try {
      const weightId = await getActiveWeightId();
      const result = await evaluateDownloadAccess(user.id, weightId, "otf");

      expect(result).toEqual({
        allowed: false,
        reason: "No active entitlement",
      });
    } finally {
      await testPool.query("DELETE FROM users WHERE id = $1", [user.id]);
    }
  });

  it("denies invalid formats", async () => {
    const userId = await getUserIdByEmail("user@test.com");
    const weightId = await getActiveWeightId();

    const result = await evaluateDownloadAccess(userId, weightId, "zip");

    expect(result.allowed).toBe(false);
    if (result.allowed) return;
    expect(result.reason).toContain("not allowed");
  });
});
