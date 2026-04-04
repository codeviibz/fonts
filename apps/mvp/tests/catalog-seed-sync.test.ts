import { describe, expect, it } from "vitest";
import { runScript, testPool } from "./helpers/db";

describe("catalog sync and seed independence", () => {
  it("keeps user/subscription/entitlement data unchanged when syncing catalog", async () => {
    const before = await testPool.query<{
      users: string;
      subscriptions: string;
      entitlements: string;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM users)::text AS users,
        (SELECT COUNT(*) FROM subscriptions)::text AS subscriptions,
        (SELECT COUNT(*) FROM entitlements)::text AS entitlements
    `);

    await runScript("scripts/sync-catalog.ts");

    const after = await testPool.query<{
      users: string;
      subscriptions: string;
      entitlements: string;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM users)::text AS users,
        (SELECT COUNT(*) FROM subscriptions)::text AS subscriptions,
        (SELECT COUNT(*) FROM entitlements)::text AS entitlements
    `);

    expect(after.rows[0]).toEqual(before.rows[0]);
  });

  it("keeps catalog read-model counts unchanged when seeding users", async () => {
    const before = await testPool.query<{
      foundries: string;
      families: string;
      weights: string;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM foundries)::text AS foundries,
        (SELECT COUNT(*) FROM font_families)::text AS families,
        (SELECT COUNT(*) FROM font_weights)::text AS weights
    `);

    await runScript("scripts/seed.ts");

    const after = await testPool.query<{
      foundries: string;
      families: string;
      weights: string;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM foundries)::text AS foundries,
        (SELECT COUNT(*) FROM font_families)::text AS families,
        (SELECT COUNT(*) FROM font_weights)::text AS weights
    `);

    expect(after.rows[0]).toEqual(before.rows[0]);
  });

  it("is idempotent and deactivates records removed from JSON source", async () => {
    const suffix = `${Date.now()}`;
    const foundrySanity = `test-foundry-${suffix}`;
    const familySanity = `test-family-${suffix}`;
    const weightSanity = `test-weight-${suffix}`;

    const foundry = await testPool.query<{ id: string }>(
      `INSERT INTO foundries (sanity_document_id, name, slug, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING id`,
      [foundrySanity, "Temp Foundry", `temp-foundry-${suffix}`]
    );

    const family = await testPool.query<{ id: string }>(
      `INSERT INTO font_families
         (sanity_document_id, foundry_id, name, slug, styles, moods, use_cases, qa_status, is_active)
       VALUES ($1, $2, $3, $4, '{}', '{}', '{}', 'published', true)
       RETURNING id`,
      [familySanity, foundry.rows[0].id, "Temp Family", `temp-family-${suffix}`]
    );

    await testPool.query(
      `INSERT INTO font_weights
         (sanity_document_id, family_id, name, slug, weight, style, is_active, sort_order)
       VALUES ($1, $2, $3, $4, 400, 'normal', true, 0)`,
      [weightSanity, family.rows[0].id, "Temp Weight", `temp-weight-${suffix}`]
    );

    try {
      await runScript("scripts/sync-catalog.ts");

      const firstSyncCounts = await testPool.query<{ foundries: string; families: string; weights: string }>(
        `SELECT
           (SELECT COUNT(*) FROM foundries WHERE is_active = true)::text AS foundries,
           (SELECT COUNT(*) FROM font_families WHERE is_active = true)::text AS families,
           (SELECT COUNT(*) FROM font_weights WHERE is_active = true)::text AS weights`
      );

      await runScript("scripts/sync-catalog.ts");

      const secondSyncCounts = await testPool.query<{ foundries: string; families: string; weights: string }>(
        `SELECT
           (SELECT COUNT(*) FROM foundries WHERE is_active = true)::text AS foundries,
           (SELECT COUNT(*) FROM font_families WHERE is_active = true)::text AS families,
           (SELECT COUNT(*) FROM font_weights WHERE is_active = true)::text AS weights`
      );

      expect(secondSyncCounts.rows[0]).toEqual(firstSyncCounts.rows[0]);

      const deactivated = await testPool.query<{
        foundry_active: boolean;
        family_active: boolean;
        weight_active: boolean;
      }>(
        `SELECT
           (SELECT is_active FROM foundries WHERE sanity_document_id = $1) AS foundry_active,
           (SELECT is_active FROM font_families WHERE sanity_document_id = $2) AS family_active,
           (SELECT is_active FROM font_weights WHERE sanity_document_id = $3) AS weight_active`,
        [foundrySanity, familySanity, weightSanity]
      );

      expect(deactivated.rows[0]).toEqual({
        foundry_active: false,
        family_active: false,
        weight_active: false,
      });
    } finally {
      await testPool.query("DELETE FROM font_weights WHERE sanity_document_id = $1", [weightSanity]);
      await testPool.query("DELETE FROM font_families WHERE sanity_document_id = $1", [familySanity]);
      await testPool.query("DELETE FROM foundries WHERE sanity_document_id = $1", [foundrySanity]);
    }
  });
});
