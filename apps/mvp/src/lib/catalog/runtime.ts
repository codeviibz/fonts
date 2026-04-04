import {
  getAllFoundries,
  getAllPublishedFamilies,
  getFamilyBySlug,
} from "./local";
import {
  getActiveFontFamilies,
  getActiveFoundries,
  getFontFamilyBySlug,
  getWeightIdsBySanityIds,
} from "@/lib/db/queries";
import { MissingDatabaseUrlError } from "@/lib/db/client";
import type { CatalogFamily } from "@/types/catalog";

function canFallbackToJson(error: unknown): boolean {
  if (!(error instanceof MissingDatabaseUrlError)) return false;
  return process.env.NODE_ENV !== "production" && !process.env.DATABASE_URL;
}

export async function getCatalogListingFamilies(): Promise<CatalogFamily[]> {
  const families = getAllPublishedFamilies();

  try {
    const [activeFamilies, activeFoundries] = await Promise.all([
      getActiveFontFamilies(),
      getActiveFoundries(),
    ]);

    const activeFamilySanityIds = new Set(
      activeFamilies.map((family) => family.sanity_document_id)
    );
    const activeFoundrySanityIds = new Set(
      activeFoundries.map((foundry) => foundry.sanity_document_id)
    );

    return families.filter(
      (family) =>
        activeFamilySanityIds.has(family.sanity_document_id) &&
        activeFoundrySanityIds.has(family.foundry_sanity_id)
    );
  } catch (error) {
    if (!canFallbackToJson(error)) {
      throw error;
    }
    // In local dev, allow JSON-only catalog when DATABASE_URL is intentionally unset.
    return families;
  }
}

export async function getCatalogStaticSlugs(): Promise<string[]> {
  const families = getAllPublishedFamilies();

  try {
    const activeFamilies = await getActiveFontFamilies();
    const activeSanityIds = new Set(
      activeFamilies.map((family) => family.sanity_document_id)
    );
    return families
      .filter((family) => activeSanityIds.has(family.sanity_document_id))
      .map((family) => family.slug);
  } catch (error) {
    if (!canFallbackToJson(error)) {
      throw error;
    }
    return families.map((family) => family.slug);
  }
}

export interface CatalogFamilyDetailResult {
  family: CatalogFamily;
  foundryName: string;
  foundrySlug?: string;
  weightIdMap: Record<string, string>;
}

export async function getCatalogFamilyDetail(
  slug: string
): Promise<CatalogFamilyDetailResult | null> {
  const family = getFamilyBySlug(slug);
  if (!family) return null;

  let activeFamilyRow = null;
  try {
    activeFamilyRow = await getFontFamilyBySlug(slug);
  } catch (error) {
    if (!canFallbackToJson(error)) {
      throw error;
    }
  }

  if (process.env.DATABASE_URL && !activeFamilyRow) {
    return null;
  }

  let weightIdMap: Record<string, string> = {};
  try {
    const sanityIds = family.weights.map((w) => w.sanity_document_id);
    weightIdMap = await getWeightIdsBySanityIds(sanityIds);
  } catch (error) {
    if (!canFallbackToJson(error)) {
      throw error;
    }
  }

  const foundry = getAllFoundries().find(
    (f) => f.sanity_document_id === family.foundry_sanity_id
  );

  return {
    family,
    foundryName: foundry?.name ?? "Unknown",
    foundrySlug: foundry?.slug,
    weightIdMap,
  };
}
