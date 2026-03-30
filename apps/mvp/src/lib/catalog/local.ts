import fs from "node:fs";
import path from "node:path";
import type { CatalogFoundry, CatalogFamily } from "@/types/catalog";

function dataDir(): string {
  return path.join(process.cwd(), "data", "fonts");
}

function readJson<T>(filename: string): T {
  const filePath = path.join(dataDir(), filename);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

let foundryCache: CatalogFoundry[] | null = null;
let familyCache: CatalogFamily[] | null = null;

function loadFoundries(): CatalogFoundry[] {
  if (!foundryCache) {
    foundryCache = readJson<CatalogFoundry[]>("foundries.json");
  }
  return foundryCache;
}

function loadFamilies(): CatalogFamily[] {
  if (!familyCache) {
    familyCache = readJson<CatalogFamily[]>("families.json");
  }
  return familyCache;
}

export function getAllFoundries(): CatalogFoundry[] {
  return loadFoundries();
}

export function getAllPublishedFamilies(): CatalogFamily[] {
  return loadFamilies().filter((f) => f.qa_status === "published");
}

export function getFamilyBySlug(slug: string): CatalogFamily | undefined {
  return loadFamilies().find((f) => f.slug === slug && f.qa_status === "published");
}

export function invalidateCache(): void {
  foundryCache = null;
  familyCache = null;
}
