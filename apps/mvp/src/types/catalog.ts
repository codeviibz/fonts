// Types for the JSON catalog source files in /data/fonts/.
// These represent the shape of the JSON on disk, not the DB rows.

export interface CatalogFoundry {
  sanity_document_id: string;
  name: string;
  slug: string;
  url?: string;
  description?: string;
}

export interface CatalogWeight {
  sanity_document_id: string;
  name: string;
  slug: string;
  weight: number;
  style: "normal" | "italic";
  preview_path?: string;
  download_path?: string;
  allowed_formats?: string[];
  sort_order?: number;
}

export interface CatalogMockup {
  src: string;
  alt: string;
}

export interface CatalogFamily {
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
  qa_status: "draft" | "approved" | "published";
  weights: CatalogWeight[];
  mockups?: CatalogMockup[];
}
