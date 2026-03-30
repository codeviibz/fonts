"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import type { CatalogFamily } from "@/types/catalog";
import { FontPreview } from "@/components/font-preview";

type FamilyWithFoundry = CatalogFamily & { foundryName: string };

interface Props {
  families: FamilyWithFoundry[];
  allStyles: string[];
  allMoods: string[];
  allUseCases: string[];
}

function FilterSection({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onToggle: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              selected.has(opt)
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-transparent text-foreground hover:bg-muted"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CatalogClient({ families, allStyles, allMoods, allUseCases }: Props) {
  const [selectedStyles, setSelectedStyles] = useState<Set<string>>(new Set());
  const [selectedMoods, setSelectedMoods] = useState<Set<string>>(new Set());
  const [selectedUseCases, setSelectedUseCases] = useState<Set<string>>(new Set());

  function toggleFilter(set: Set<string>, setFn: (s: Set<string>) => void, value: string) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setFn(next);
  }

  const hasFilters = selectedStyles.size > 0 || selectedMoods.size > 0 || selectedUseCases.size > 0;

  const filtered = useMemo(() => {
    return families.filter((f) => {
      if (selectedStyles.size > 0 && !f.styles.some((s) => selectedStyles.has(s))) return false;
      if (selectedMoods.size > 0 && !f.moods.some((m) => selectedMoods.has(m))) return false;
      if (selectedUseCases.size > 0 && !f.use_cases.some((u) => selectedUseCases.has(u))) return false;
      return true;
    });
  }, [families, selectedStyles, selectedMoods, selectedUseCases]);

  return (
    <div className="space-y-8">
      <div className="space-y-4 rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Filters</p>
          {hasFilters && (
            <button
              onClick={() => {
                setSelectedStyles(new Set());
                setSelectedMoods(new Set());
                setSelectedUseCases(new Set());
              }}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              Clear all
            </button>
          )}
        </div>
        <FilterSection
          label="Style"
          options={allStyles}
          selected={selectedStyles}
          onToggle={(v) => toggleFilter(selectedStyles, setSelectedStyles, v)}
        />
        <FilterSection
          label="Mood"
          options={allMoods}
          selected={selectedMoods}
          onToggle={(v) => toggleFilter(selectedMoods, setSelectedMoods, v)}
        />
        <FilterSection
          label="Use Case"
          options={allUseCases}
          selected={selectedUseCases}
          onToggle={(v) => toggleFilter(selectedUseCases, setSelectedUseCases, v)}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "family" : "families"}
        {hasFilters ? " matching" : ""}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground">No fonts match your filters</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((family) => (
            <FontCard key={family.slug} family={family} />
          ))}
        </div>
      )}
    </div>
  );
}

function FontCard({ family }: { family: FamilyWithFoundry }) {
  const previewWeight = family.weights.find((w) => w.weight === 400) ?? family.weights[0];
  const mockup = family.mockups?.[0];

  return (
    <Link
      href={`/fonts/${family.slug}` as `/fonts/${string}`}
      className="group block rounded-lg border border-border p-5 transition-colors hover:border-foreground/20 hover:bg-muted/50"
    >
      <div className="mb-4 h-28 overflow-hidden rounded-md bg-muted/30 p-4">
        {previewWeight?.preview_path ? (
          <FontPreview
            previewPath={previewWeight.preview_path}
            familyName={family.name}
            text={family.name}
            className="text-3xl leading-tight"
          />
        ) : (
          <p className="flex h-full items-center justify-center text-2xl font-semibold text-foreground/60">
            {family.name}
          </p>
        )}
      </div>
      {mockup && (
        <div className="mb-4 overflow-hidden rounded-md border border-border">
          <Image
            src={`/mockups/${mockup.src}`}
            alt={mockup.alt}
            width={320}
            height={180}
            className="h-20 w-full object-cover"
          />
        </div>
      )}

      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-medium leading-tight group-hover:text-primary">
            {family.name}
          </h2>
          {family.featured && (
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
              Featured
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {family.foundryName} &middot; {family.category} &middot;{" "}
          {family.weights.length} {family.weights.length === 1 ? "weight" : "weights"}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {[...family.styles, ...family.moods].slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>
    </Link>
  );
}
