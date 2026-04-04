import { Pool } from "pg";
import { parseIsoDate, parseRequiredText } from "./_shared";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const foundryId = process.argv[2];
const startDate = process.argv[3];
const endDate = process.argv[4];

if (!foundryId || !startDate || !endDate) {
  console.error("Usage: export-downloads.ts <foundryId> <startDate> <endDate>");
  console.error("  Dates in YYYY-MM-DD format");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  const normalizedFoundryId = parseRequiredText(foundryId, "foundryId");
  const normalizedStartDate = parseIsoDate(startDate, "startDate");
  const normalizedEndDate = parseIsoDate(endDate, "endDate");

  const foundry = await pool.query(
    "SELECT id, name FROM foundries WHERE id = $1",
    [normalizedFoundryId]
  );

  if (foundry.rows.length === 0) {
    console.error(`Foundry ${normalizedFoundryId} not found`);
    process.exit(1);
  }

  console.error(
    `Exporting downloads for "${foundry.rows[0].name}" from ${normalizedStartDate} to ${normalizedEndDate}\n`
  );

  const result = await pool.query(
    `SELECT
       dr.id,
       dr.user_id,
       dr.anon_subject_id,
       dr.font_weight_id,
       fw.name AS weight_name,
       ff.name AS family_name,
       dr.format,
       dr.requested_at,
       dr.ip_address,
       dr.user_agent
     FROM download_requested dr
     JOIN font_weights fw ON fw.id = dr.font_weight_id
     JOIN font_families ff ON ff.id = dr.font_family_id
     WHERE dr.foundry_id = $1
       AND dr.requested_at >= $2::date
       AND dr.requested_at < ($3::date + interval '1 day')
     ORDER BY dr.requested_at ASC`,
    [normalizedFoundryId, normalizedStartDate, normalizedEndDate]
  );

  if (result.rows.length === 0) {
    console.error("No downloads found for this period.");
    return;
  }

  const headers = [
    "id",
    "user_id",
    "anon_subject_id",
    "family_name",
    "weight_name",
    "format",
    "requested_at",
    "ip_address",
    "user_agent",
  ];
  console.log(headers.join("\t"));

  for (const row of result.rows) {
    const values = [
      row.id,
      row.user_id ?? "",
      row.anon_subject_id ?? "",
      row.family_name,
      row.weight_name,
      row.format,
      row.requested_at?.toISOString() ?? "",
      row.ip_address ?? "",
      row.user_agent ?? "",
    ];
    console.log(values.join("\t"));
  }

  console.error(`\n${result.rowCount} rows exported.`);
}

main()
  .catch((err) => {
    console.error("Export failed:", err);
    process.exit(1);
  })
  .finally(() => pool.end());
