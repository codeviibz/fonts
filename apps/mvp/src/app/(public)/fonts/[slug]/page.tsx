import { notFound } from "next/navigation";
import { getFamilyBySlug, getCatalogFamilyDetail, getCatalogStaticSlugs } from "@/lib/catalog";
import { getSession } from "@/lib/auth";
import { getActiveEntitlement } from "@/lib/db/queries";
import { FontDetailClient } from "./font-detail-client";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
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
  const slugs = await getCatalogStaticSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function FontDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const detail = await getCatalogFamilyDetail(slug);
  if (!detail) notFound();

  const session = await getSession();
  let hasEntitlement = false;
  if (session?.user?.id) {
    const ent = await getActiveEntitlement(Number(session.user.id));
    hasEntitlement = ent !== null;
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <FontDetailClient
        family={detail.family}
        foundryName={detail.foundryName}
        foundrySlug={detail.foundrySlug}
        isLoggedIn={!!session?.user}
        hasEntitlement={hasEntitlement}
        weightIdMap={detail.weightIdMap}
      />
    </main>
  );
}
