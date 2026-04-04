import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { Pool } from "pg";

const execFileAsync = promisify(execFile);

export const TEST_DATABASE_URL = "postgresql://fontapp:fontapp@localhost:5433/fontapp";
const DATABASE_URL = process.env.DATABASE_URL ?? TEST_DATABASE_URL;
const APP_ROOT = path.resolve(__dirname, "..", "..");

export const testPool = new Pool({
  connectionString: DATABASE_URL,
});

export async function runScript(
  relativeScriptPath: string,
  extraEnv?: Record<string, string>,
  args: string[] = []
): Promise<void> {
  await execFileAsync(
    "npx",
    ["tsx", relativeScriptPath, ...args],
    {
      cwd: APP_ROOT,
      env: {
        ...process.env,
        DATABASE_URL,
        ...extraEnv,
      },
    }
  );
}

export async function getUserIdByEmail(email: string): Promise<number> {
  const result = await testPool.query<{ id: number }>("SELECT id FROM users WHERE email = $1", [email]);
  if (!result.rows[0]) {
    throw new Error(`Missing seeded user: ${email}`);
  }
  return result.rows[0].id;
}

export async function getActiveWeightId(): Promise<string> {
  const result = await testPool.query<{ id: string }>(
    "SELECT id FROM font_weights WHERE is_active = true ORDER BY created_at ASC LIMIT 1"
  );
  if (!result.rows[0]) {
    throw new Error("No active font weight found for tests");
  }
  return result.rows[0].id;
}

export async function getFoundryIdForWeight(weightId: string): Promise<string> {
  const result = await testPool.query<{ foundry_id: string }>(
    `SELECT ff.foundry_id
     FROM font_weights fw
     JOIN font_families ff ON ff.id = fw.family_id
     WHERE fw.id = $1`,
    [weightId]
  );
  if (!result.rows[0]) {
    throw new Error(`No foundry found for weight ${weightId}`);
  }
  return result.rows[0].foundry_id;
}

export async function createTempUser(prefix = "temp"): Promise<{ id: number; email: string }> {
  const email = `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@test.com`;
  const result = await testPool.query<{ id: number }>(
    `INSERT INTO users (name, email, role)
     VALUES ($1, $2, 'subscriber')
     RETURNING id`,
    ["Temp User", email]
  );
  return { id: result.rows[0].id, email };
}
