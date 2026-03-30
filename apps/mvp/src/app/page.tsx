import Link from "next/link";
import { getAllPublishedFamilies, getAllFoundries } from "@/lib/catalog";
import { getSession } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { FontPreview } from "@/components/font-preview";

export default async function Home() {
  const session = await getSession();
  const families = getAllPublishedFamilies();
  const foundries = getAllFoundries();
  const foundryMap = new Map(foundries.map((f) => [f.sanity_document_id, f]));

  const featured = families.filter((f) => f.featured);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-16">
      {/* Hero */}
      <section className="space-y-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Premium Fonts,{" "}
          <span className="text-primary">One Subscription</span>
        </h1>
        <p className="mx-auto max-w-xl text-lg text-muted-foreground">
          Access our curated collection of professional typefaces. Download in
          OTF, TTF, and WOFF2 — ready for print, web, and apps.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/fonts" className={buttonVariants({ size: "lg" })}>
            Browse catalog
          </Link>
          {!session?.user && (
            <Link
              href="/login"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Sign in
            </Link>
          )}
        </div>
      </section>

      {/* Stats */}
      <section className="mt-16 grid grid-cols-3 gap-4 text-center">
        <div className="rounded-lg border border-border p-4">
          <p className="text-2xl font-semibold">{families.length}</p>
          <p className="text-sm text-muted-foreground">Font families</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-2xl font-semibold">
            {families.reduce((n, f) => n + f.weights.length, 0)}
          </p>
          <p className="text-sm text-muted-foreground">Total weights</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-2xl font-semibold">{foundries.length}</p>
          <p className="text-sm text-muted-foreground">Foundries</p>
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="mt-16 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">
              Featured Fonts
            </h2>
            <Link
              href="/fonts"
              className="text-sm text-muted-foreground underline hover:text-foreground"
            >
              View all
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {featured.map((family) => {
              const foundry = foundryMap.get(family.foundry_sanity_id);
              const previewWeight =
                family.weights.find((w) => w.weight === 400) ?? family.weights[0];

              return (
                <Link
                  key={family.slug}
                  href={`/fonts/${family.slug}` as `/fonts/${string}`}
                  className="group block rounded-lg border border-border p-6 transition-colors hover:border-foreground/20 hover:bg-muted/50"
                >
                  <div className="mb-4 h-20 overflow-hidden">
                    {previewWeight?.preview_path ? (
                      <FontPreview
                        previewPath={previewWeight.preview_path}
                        familyName={family.name}
                        text={family.name}
                        className="text-4xl leading-tight"
                      />
                    ) : (
                      <p className="text-4xl font-semibold leading-tight text-foreground/60">
                        {family.name}
                      </p>
                    )}
                  </div>
                  <h3 className="font-medium group-hover:text-primary">
                    {family.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {foundry?.name ?? "Unknown"} &middot; {family.category} &middot;{" "}
                    {family.weights.length} weights
                  </p>
                  {family.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {family.description}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
