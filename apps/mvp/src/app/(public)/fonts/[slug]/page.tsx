import { notFound } from "next/navigation";
import { getFamilyBySlug, getAllPublishedFamilies, getAllFoundries } from "@/lib/catalog";
import { getSession } from "@/lib/auth";
import {
  getActiveEntitlement,
  getFontFamilyBySlug,
  getActiveFontFamilies,
} from "@/lib/db/queries";
import { FontDetailClient } from "./font-detail-client";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function shouldFallbackToJson(error: unknown): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    error instanceof Error &&
    error.message.includes("DATABASE_URL environment variable is required")
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const family = getFamilyBySlug(slug);
  if (!family) return { title: "Font not found" };
  return {
    title: `${family.name} — Fonts`,
    description: family.description ?? `${family.name} font family`,
  };
}

export async function generateStaticParams() {
  const families = getAllPublishedFamilies();

  try {
    const activeFamilies = await getActiveFontFamilies();
    const activeSanityIds = new Set(
      activeFamilies.map((family) => family.sanity_document_id)
    );

    return families
      .filter((family) => activeSanityIds.has(family.sanity_document_id))
      .map((family) => ({ slug: family.slug }));
  } catch (error) {
    if (shouldFallbackToJson(error)) {
      return families.map((family) => ({ slug: family.slug }));
    }
    throw error;
  }
}

export default async function FontDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const family = getFamilyBySlug(slug);
  if (!family) notFound();

  let activeFamilyRow = null;
  try {
    activeFamilyRow = await getFontFamilyBySlug(slug);
  } catch (error) {
    if (!shouldFallbackToJson(error)) {
      throw error;
    }
  }
  if (process.env.DATABASE_URL && !activeFamilyRow) notFound();

  const foundries = getAllFoundries();
  const foundry = foundries.find((f) => f.sanity_document_id === family.foundry_sanity_id);

  const session = await getSession();
  let hasEntitlement = false;
  if (session?.user?.id) {
    const ent = await getActiveEntitlement(Number(session.user.id));
    hasEntitlement = ent !== null;
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <FontDetailClient
        family={family}
        foundryName={foundry?.name ?? "Unknown"}
        foundrySlug={foundry?.slug}
        isLoggedIn={!!session?.user}
        hasEntitlement={hasEntitlement}
      />
    </main>
  );
}
