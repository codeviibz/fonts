import { getAllPublishedFamilies, getAllFoundries } from "@/lib/catalog";
import { getActiveFontFamilies, getActiveFoundries } from "@/lib/db/queries";
import { CatalogClient } from "./catalog-client";

function shouldFallbackToJson(error: unknown): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    error instanceof Error &&
    error.message.includes("DATABASE_URL environment variable is required")
  );
}

export const metadata = {
  title: "Font Catalog — Fonts",
  description: "Browse our full collection of premium typefaces",
};

export default async function CatalogPage() {
  const families = getAllPublishedFamilies();
  const foundries = getAllFoundries();

  let activeCatalogFamilies = families;
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

    activeCatalogFamilies = families.filter(
      (family) =>
        activeFamilySanityIds.has(family.sanity_document_id) &&
        activeFoundrySanityIds.has(family.foundry_sanity_id)
    );
  } catch (error) {
    if (!shouldFallbackToJson(error)) {
      throw error;
    }
    // Local-dev fallback when DATABASE_URL is intentionally unset.
  }

  const foundryMap = new Map(foundries.map((f) => [f.sanity_document_id, f]));

  const allStyles = [...new Set(activeCatalogFamilies.flatMap((f) => f.styles))].sort();
  const allMoods = [...new Set(activeCatalogFamilies.flatMap((f) => f.moods))].sort();
  const allUseCases = [...new Set(activeCatalogFamilies.flatMap((f) => f.use_cases))].sort();

  const familiesWithFoundry = activeCatalogFamilies.map((f) => ({
    ...f,
    foundryName: foundryMap.get(f.foundry_sanity_id)?.name ?? "Unknown",
  }));

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Font Catalog</h1>
        <p className="text-muted-foreground">
          Browse our collection of {activeCatalogFamilies.length} premium typefaces
        </p>
      </div>
      <CatalogClient
        families={familiesWithFoundry}
        allStyles={allStyles}
        allMoods={allMoods}
        allUseCases={allUseCases}
      />
    </main>
  );
}
