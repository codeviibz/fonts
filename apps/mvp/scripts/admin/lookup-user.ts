import { Pool } from "pg";
import { parseRequiredText } from "./_shared";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: lookup-user.ts <email>");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  const normalizedEmail = parseRequiredText(email, "email");
  const userResult = await pool.query(
    "SELECT id, name, email, role, created_at FROM users WHERE email = $1",
    [normalizedEmail]
  );

  if (userResult.rows.length === 0) {
    console.log(`No user found with email: ${normalizedEmail}`);
    return;
  }

  const user = userResult.rows[0];
  console.log("\n=== User ===");
  console.log(`  ID:      ${user.id}`);
  console.log(`  Name:    ${user.name}`);
  console.log(`  Email:   ${user.email}`);
  console.log(`  Role:    ${user.role}`);
  console.log(`  Created: ${user.created_at}`);

  const subResult = await pool.query(
    "SELECT id, plan, status, current_period_start, current_period_end FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC",
    [user.id]
  );

  if (subResult.rows.length > 0) {
    console.log("\n=== Subscriptions ===");
    for (const s of subResult.rows) {
      console.log(`  ${s.id}  ${s.plan}  ${s.status}  ${s.current_period_start?.toISOString().slice(0, 10) ?? "—"} → ${s.current_period_end?.toISOString().slice(0, 10) ?? "—"}`);
    }
  } else {
    console.log("\n  No subscriptions.");
  }

  const entResult = await pool.query(
    "SELECT id, type, status, allowed_formats FROM entitlements WHERE user_id = $1 ORDER BY created_at DESC",
    [user.id]
  );

  if (entResult.rows.length > 0) {
    console.log("\n=== Entitlements ===");
    for (const e of entResult.rows) {
      console.log(`  ${e.id}  ${e.type}  ${e.status}  formats=${e.allowed_formats}`);
    }
  } else {
    console.log("\n  No entitlements.");
  }

  const dlResult = await pool.query(
    "SELECT COUNT(*) as count FROM download_requested WHERE user_id = $1",
    [user.id]
  );
  console.log(`\n=== Downloads ===`);
  console.log(`  Total: ${dlResult.rows[0].count}`);

  console.log("");
}

main()
  .catch((err) => {
    console.error("Lookup failed:", err);
    process.exit(1);
  })
  .finally(() => pool.end());
