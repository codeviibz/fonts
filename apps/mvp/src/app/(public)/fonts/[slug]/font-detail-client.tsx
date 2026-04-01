"use client";

import { useState } from "react";
import Link from "next/link";
import type { CatalogFamily, CatalogWeight } from "@/types/catalog";
import { FontPreview } from "@/components/font-preview";
import { Button, buttonVariants } from "@/components/ui/button";

interface Props {
  family: CatalogFamily;
  foundryName: string;
  foundrySlug?: string;
  isLoggedIn: boolean;
  hasEntitlement: boolean;
  weightIdMap: Record<string, string>;
}

const SPECIMEN_TEXTS = [
  "The quick brown fox jumps over the lazy dog",
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  "abcdefghijklmnopqrstuvwxyz",
  "0123456789 !@#$%&*",
];

export function FontDetailClient({
  family,
  foundryName,
  isLoggedIn,
  hasEntitlement,
  weightIdMap,
}: Props) {
  const [specimenText, setSpecimenText] = useState(SPECIMEN_TEXTS[0]);
  const [specimenSize, setSpecimenSize] = useState(40);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">{family.name}</h1>
              {family.featured && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold uppercase text-primary">
                  Featured
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              by {foundryName} &middot; {family.category} &middot;{" "}
              {family.weights.length} {family.weights.length === 1 ? "weight" : "weights"}
            </p>
          </div>
          <DownloadCTA isLoggedIn={isLoggedIn} hasEntitlement={hasEntitlement} />
        </div>
        {family.description && (
          <p className="max-w-2xl leading-relaxed text-muted-foreground">
            {family.description}
          </p>
        )}
      </section>

      {/* Specimen */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Type Specimen</h2>
        <div className="space-y-3 rounded-lg border border-border p-5">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={specimenText}
              onChange={(e) => setSpecimenText(e.target.value)}
              className="flex-1 rounded-md border border-border bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Type to preview…"
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground" htmlFor="specimen-size">
                Size
              </label>
              <input
                id="specimen-size"
                type="range"
                min={16}
                max={96}
                value={specimenSize}
                onChange={(e) => setSpecimenSize(Number(e.target.value))}
                className="w-24"
              />
              <span className="w-8 text-xs text-muted-foreground">{specimenSize}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {SPECIMEN_TEXTS.map((t, i) => (
              <button
                key={i}
                onClick={() => setSpecimenText(t)}
                className={`rounded-md border px-2 py-1 text-[10px] transition-colors ${
                  specimenText === t
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {t.length > 20 ? t.slice(0, 20) + "…" : t}
              </button>
            ))}
          </div>
          <div className="space-y-4 pt-2">
            {family.weights.map((w) => (
              <SpecimenRow
                key={w.slug}
                weight={w}
                familyName={family.name}
                text={specimenText}
                fontSize={specimenSize}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Mockups */}
      {family.mockups && family.mockups.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">In Use</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {family.mockups.map((m) => (
              <div
                key={m.src}
                className="overflow-hidden rounded-lg border border-border bg-muted/30"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/mockups/${m.src}`}
                  alt={m.alt}
                  className="h-48 w-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement!.classList.add("flex", "items-center", "justify-center", "h-48");
                    const placeholder = document.createElement("p");
                    placeholder.className = "text-sm text-muted-foreground";
                    placeholder.textContent = m.alt;
                    e.currentTarget.parentElement!.appendChild(placeholder);
                  }}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Weights */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Available Weights</h2>
        <div className="divide-y divide-border rounded-lg border border-border">
          {family.weights.map((w) => (
            <WeightRow
              key={w.slug}
              weight={w}
              familyName={family.name}
              isLoggedIn={isLoggedIn}
              hasEntitlement={hasEntitlement}
              dbWeightId={weightIdMap[w.sanity_document_id]}
            />
          ))}
        </div>
      </section>

      {/* Tags */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Tags</h2>
        <div className="flex flex-wrap gap-2">
          {[...family.styles, ...family.moods, ...family.use_cases].map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </section>

      {/* Foundry */}
      <section className="rounded-lg border border-border p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Foundry
        </p>
        <p className="mt-1 text-lg font-medium">{foundryName}</p>
      </section>
    </div>
  );
}

function SpecimenRow({
  weight,
  familyName,
  text,
  fontSize,
}: {
  weight: CatalogWeight;
  familyName: string;
  text: string;
  fontSize: number;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">
        {weight.name} ({weight.weight})
      </p>
      {weight.preview_path ? (
        <FontPreview
          previewPath={weight.preview_path}
          familyName={familyName}
          text={text}
          weight={weight.weight}
          style={weight.style}
          className="break-all leading-snug"
          fontSize={`${fontSize}px`}
        />
      ) : (
        <p
          className="break-all leading-snug"
          style={{ fontSize: `${fontSize}px`, fontWeight: weight.weight }}
        >
          {text}
        </p>
      )}
    </div>
  );
}

function WeightRow({
  weight,
  familyName,
  isLoggedIn,
  hasEntitlement,
  dbWeightId,
}: {
  weight: CatalogWeight;
  familyName: string;
  isLoggedIn: boolean;
  hasEntitlement: boolean;
  dbWeightId?: string;
}) {
  const formats = weight.allowed_formats ?? ["otf", "ttf", "woff2"];
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-4">
        <span className="w-10 text-center text-xs text-muted-foreground">
          {weight.weight}
        </span>
        <div>
          <p className="text-sm font-medium">
            {familyName} {weight.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {weight.style} &middot; {formats.join(", ")}
          </p>
        </div>
      </div>
      <DownloadButton
        isLoggedIn={isLoggedIn}
        hasEntitlement={hasEntitlement}
        dbWeightId={dbWeightId}
        formats={formats}
      />
    </div>
  );
}

function DownloadCTA({
  isLoggedIn,
  hasEntitlement,
}: {
  isLoggedIn: boolean;
  hasEntitlement: boolean;
}) {
  if (!isLoggedIn) {
    return (
      <Link href="/login" className={buttonVariants({ size: "sm" })}>
        Sign in to download
      </Link>
    );
  }
  if (!hasEntitlement) {
    return (
      <Link href="/subscribe" className={buttonVariants({ size: "sm" })}>
        Subscribe to download
      </Link>
    );
  }
  return null;
}

function DownloadButton({
  isLoggedIn,
  hasEntitlement,
  dbWeightId,
  formats,
}: {
  isLoggedIn: boolean;
  hasEntitlement: boolean;
  dbWeightId?: string;
  formats: string[];
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isLoggedIn) {
    return (
      <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm" })}>
        Sign in
      </Link>
    );
  }
  if (!hasEntitlement) {
    return (
      <Link href="/subscribe" className={buttonVariants({ variant: "outline", size: "sm" })}>
        Subscribe
      </Link>
    );
  }

  if (!dbWeightId) {
    return (
      <Button variant="outline" size="sm" disabled>
        Unavailable
      </Button>
    );
  }

  const preferredFormat = formats[0] ?? "otf";

  async function handleDownload() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/download/${dbWeightId}?format=${preferredFormat}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Download failed (${res.status})`);
      }
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition");
      let filename = `font.${preferredFormat}`;
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-xs text-destructive">{error}</span>
      )}
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={handleDownload}
      >
        {loading ? "Downloading…" : "Download"}
      </Button>
    </div>
  );
}
