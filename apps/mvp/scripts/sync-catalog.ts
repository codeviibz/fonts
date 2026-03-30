import fs from "node:fs";
import path from "node:path";
import { Pool, type PoolClient } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

interface JsonFoundry {
  sanity_document_id: string;
  name: string;
  slug: string;
  url?: string;
  description?: string;
}

interface JsonWeight {
  sanity_document_id: string;
  name: string;
  slug: string;
  weight: number;
  style: string;
  preview_path?: string;
  download_path?: string;
  allowed_formats?: string[];
  sort_order?: number;
}

interface JsonFamily {
  sanity_document_id: string;
  foundry_sanity_id: string;
  name: string;
  slug: string;
  description?: string;
  category?: string;
  styles: string[];
  moods: string[];
  use_cases: string[];
  featured?: boolean;
  qa_status: string;
  weights: JsonWeight[];
  mockups?: { src: string; alt: string }[];
}

function readJson<T>(filename: string): T {
  const filePath = path.join(process.cwd(), "data", "fonts", filename);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

function assertUnique<T>(items: T[], key: (item: T) => string, label: string): void {
  const seen = new Set<string>();
  for (const item of items) {
    const value = key(item);
    if (seen.has(value)) {
      throw new Error(`Invalid catalog JSON: duplicate ${label} "${value}"`);
    }
    seen.add(value);
  }
}

function validateCatalog(foundries: JsonFoundry[], families: JsonFamily[]): void {
  assertUnique(foundries, (f) => f.sanity_document_id, "foundry sanity_document_id");
  assertUnique(foundries, (f) => f.slug, "foundry slug");

  assertUnique(families, (f) => f.sanity_document_id, "family sanity_document_id");
  assertUnique(families, (f) => f.slug, "family slug");

  const foundrySanityIds = new Set(foundries.map((f) => f.sanity_document_id));
  for (const family of families) {
    if (!foundrySanityIds.has(family.foundry_sanity_id)) {
      throw new Error(
        `Invalid catalog JSON: family "${family.slug}" references missing foundry "${family.foundry_sanity_id}"`
      );
    }

    assertUnique(
      family.weights,
      (w) => w.sanity_document_id,
      `weight sanity_document_id in family "${family.slug}"`
    );
    assertUnique(
      family.weights,
      (w) => w.slug,
      `weight slug in family "${family.slug}"`
    );
  }
}

async function syncFoundries(client: PoolClient, foundries: JsonFoundry[]): Promise<Map<string, string>> {
  const sanityToDbId = new Map<string, string>();

  for (const f of foundries) {
    const result = await client.query<{ id: string }>(
      `INSERT INTO foundries (sanity_document_id, name, slug, url, description, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (sanity_document_id) DO UPDATE SET
         name = EXCLUDED.name,
         slug = EXCLUDED.slug,
         url = EXCLUDED.url,
         description = EXCLUDED.description,
         is_active = true,
         updated_at = now()
       RETURNING id`,
      [f.sanity_document_id, f.name, f.slug, f.url ?? null, f.description ?? null]
    );
    sanityToDbId.set(f.sanity_document_id, result.rows[0].id);
  }

  const sanityIds = foundries.map((f) => f.sanity_document_id);
  const deactivated = await client.query(
    `UPDATE foundries SET is_active = false, updated_at = now()
     WHERE is_active = true AND NOT (sanity_document_id = ANY($1::text[]))`,
    [sanityIds]
  );
  if (deactivated.rowCount && deactivated.rowCount > 0) {
    console.log(`  deactivated ${deactivated.rowCount} foundri(es) no longer in JSON`);
  }

  return sanityToDbId;
}

async function syncFamilies(
  client: PoolClient,
  families: JsonFamily[],
  foundryMap: Map<string, string>
): Promise<Map<string, string>> {
  const sanityToDbId = new Map<string, string>();

  for (const f of families) {
    const foundryId = foundryMap.get(f.foundry_sanity_id);
    if (!foundryId) {
      throw new Error(
        `Invalid catalog JSON: family "${f.slug}" references missing foundry "${f.foundry_sanity_id}"`
      );
    }

    const result = await client.query<{ id: string }>(
      `INSERT INTO font_families
         (sanity_document_id, foundry_id, name, slug, description, category,
          styles, moods, use_cases, featured, qa_status, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
       ON CONFLICT (sanity_document_id) DO UPDATE SET
         foundry_id = EXCLUDED.foundry_id,
         name = EXCLUDED.name,
         slug = EXCLUDED.slug,
         description = EXCLUDED.description,
         category = EXCLUDED.category,
         styles = EXCLUDED.styles,
         moods = EXCLUDED.moods,
         use_cases = EXCLUDED.use_cases,
         featured = EXCLUDED.featured,
         qa_status = EXCLUDED.qa_status,
         is_active = true,
         updated_at = now()
       RETURNING id`,
      [
        f.sanity_document_id,
        foundryId,
        f.name,
        f.slug,
        f.description ?? null,
        f.category ?? null,
        f.styles,
        f.moods,
        f.use_cases,
        f.featured ?? false,
        f.qa_status,
      ]
    );
    sanityToDbId.set(f.sanity_document_id, result.rows[0].id);
  }

  const sanityIds = families.map((f) => f.sanity_document_id);
  const deactivated = await client.query(
    `UPDATE font_families SET is_active = false, updated_at = now()
     WHERE is_active = true AND NOT (sanity_document_id = ANY($1::text[]))`,
    [sanityIds]
  );
  if (deactivated.rowCount && deactivated.rowCount > 0) {
    console.log(`  deactivated ${deactivated.rowCount} famil(ies) no longer in JSON`);
  }

  return sanityToDbId;
}

async function syncWeights(
  client: PoolClient,
  families: JsonFamily[],
  familyMap: Map<string, string>
): Promise<void> {
  const allWeightSanityIds: string[] = [];

  for (const fam of families) {
    const familyId = familyMap.get(fam.sanity_document_id);
    if (!familyId) continue;

    for (const w of fam.weights) {
      allWeightSanityIds.push(w.sanity_document_id);

      await client.query(
        `INSERT INTO font_weights
           (sanity_document_id, family_id, name, slug, weight, style,
            preview_path, download_path, allowed_formats, is_active, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10)
         ON CONFLICT (sanity_document_id) DO UPDATE SET
           family_id = EXCLUDED.family_id,
           name = EXCLUDED.name,
           slug = EXCLUDED.slug,
           weight = EXCLUDED.weight,
           style = EXCLUDED.style,
           preview_path = EXCLUDED.preview_path,
           download_path = EXCLUDED.download_path,
           allowed_formats = EXCLUDED.allowed_formats,
           is_active = true,
           sort_order = EXCLUDED.sort_order,
           updated_at = now()`,
        [
          w.sanity_document_id,
          familyId,
          w.name,
          w.slug,
          w.weight,
          w.style,
          w.preview_path ?? null,
          w.download_path ?? null,
          w.allowed_formats ?? ["otf", "ttf", "woff2"],
          w.sort_order ?? 0,
        ]
      );
    }
  }

  const deactivated = await client.query(
    `UPDATE font_weights SET is_active = false, updated_at = now()
     WHERE is_active = true AND NOT (sanity_document_id = ANY($1::text[]))`,
    [allWeightSanityIds]
  );
  if (deactivated.rowCount && deactivated.rowCount > 0) {
    console.log(`  deactivated ${deactivated.rowCount} weight(s) no longer in JSON`);
  }
}

async function main() {
  console.log("Syncing catalog from JSON to Postgres...\n");

  try {
    const foundries = readJson<JsonFoundry[]>("foundries.json");
    const families = readJson<JsonFamily[]>("families.json");
    validateCatalog(foundries, families);

    console.log(`  foundries: ${foundries.length} in JSON`);
    console.log(`  families:  ${families.length} in JSON`);
    console.log(`  weights:   ${families.reduce((n, f) => n + f.weights.length, 0)} in JSON\n`);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const foundryMap = await syncFoundries(client, foundries);
      console.log(`  synced ${foundryMap.size} foundri(es)`);

      const familyMap = await syncFamilies(client, families, foundryMap);
      console.log(`  synced ${familyMap.size} famil(ies)`);

      await syncWeights(client, families, familyMap);
      console.log("  synced weights");

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    console.log("\nCatalog sync complete.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
