import { afterAll, beforeAll } from "vitest";
import { runScript, testPool, TEST_DATABASE_URL } from "./helpers/db";

process.env.DATABASE_URL ??= TEST_DATABASE_URL;
process.env.DEV_AUTH_BYPASS ??= "true";
process.env.NEXTAUTH_URL ??= "http://localhost:3000";
process.env.NEXTAUTH_SECRET ??= "test-secret";

beforeAll(async () => {
  await runScript("scripts/run-migration.ts");
  await runScript("scripts/sync-catalog.ts");
  await runScript("scripts/seed.ts");
}, 120_000);

afterAll(async () => {
  await testPool.end();
});
