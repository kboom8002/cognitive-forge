/**
 * Gallery v2.0 Catalog, PilotPack & Benchmark Loader
 *
 * Implements D19_GALLERY_DOMAIN_TAXONOMY_AND_CATALOG.md, D23_PILOT_AGENT_PACKS_12_SPECS.md,
 * D24_BENCHMARK_LAB_AND_AB_COMPARISON.md, GX01, GX02, and GX04:
 * - Loads and validates the 36 `CatalogEntry` definitions (`agents36.json`),
 *   6 primary taxonomy categories (`taxonomy.json`), 6 multi-agent bundles (`bundles.json`),
 *   12 `PilotPack` definitions (`pilot_packs/AG*.json`), and 36 `BenchmarkTask` fixtures (`benchmarks/tasks.json`).
 */

import * as fs from "fs";
import * as path from "path";
import {
  BenchmarkTaskSchema,
  CatalogEntrySchema,
  PilotPackSchema,
  type BenchmarkTask,
  type CatalogEntry,
  type PilotPack,
} from "@cognitive-forge/core";
import { EMBEDDED_GALLERY_CATALOG } from "./embedded-catalog";

export interface TaxonomyCategory {
  id: string;
  label: string;
}

export interface GalleryTaxonomy {
  version: string;
  primary_category_rule: string;
  categories: TaxonomyCategory[];
  secondary_tags: string[];
  bundle_rule: string;
}

export interface GalleryBundle {
  bundle_id: string;
  name: string;
  agent_ids: string[];
  goal: string;
}

export interface LoadedGalleryCatalog {
  taxonomy: GalleryTaxonomy;
  entries: CatalogEntry[];
  bundles: GalleryBundle[];
  pilotPacks: PilotPack[];
  benchmarkTasks: BenchmarkTask[];
}

function resolveGalleryDocsRoot(customRoot?: string): string {
  if (customRoot) return customRoot;
  const candidates = [
    path.resolve(process.cwd(), "docs/Cognitive_Forge_OS_Gallery_Repo_Docs_v2_0/gallery"),
    path.resolve(process.cwd(), "../../docs/Cognitive_Forge_OS_Gallery_Repo_Docs_v2_0/gallery"),
    path.resolve(__dirname, "../../../../docs/Cognitive_Forge_OS_Gallery_Repo_Docs_v2_0/gallery"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0]!;
}

let cachedCatalog: LoadedGalleryCatalog | null = null;

/**
 * Loads and validates all Gallery v2.0 static catalog, pilot pack, and benchmark artifacts.
 */
export function loadGalleryCatalog(customGalleryDir?: string): LoadedGalleryCatalog {
  if (!customGalleryDir && cachedCatalog) {
    return cachedCatalog;
  }

  const galleryDir = resolveGalleryDocsRoot(customGalleryDir);
  const taxonomyPath = path.join(galleryDir, "catalog/taxonomy.json");

  if (!customGalleryDir && !fs.existsSync(taxonomyPath)) {
    cachedCatalog = EMBEDDED_GALLERY_CATALOG;
    return cachedCatalog;
  }

  const taxonomyRaw = JSON.parse(
    fs.readFileSync(taxonomyPath, "utf8")
  ) as GalleryTaxonomy;

  const entriesRaw = JSON.parse(
    fs.readFileSync(path.join(galleryDir, "catalog/agents36.json"), "utf8")
  ) as unknown[];
  const entries = entriesRaw.map((item) => CatalogEntrySchema.parse(item));

  const bundlesRaw = JSON.parse(
    fs.readFileSync(path.join(galleryDir, "catalog/bundles.json"), "utf8")
  ) as GalleryBundle[];

  const pilotPacksDir = path.join(galleryDir, "pilot_packs");
  const pilotFiles = fs
    .readdirSync(pilotPacksDir)
    .filter((f) => f.endsWith(".json"))
    .sort();
  const pilotPacks = pilotFiles.map((file) => {
    const raw = JSON.parse(fs.readFileSync(path.join(pilotPacksDir, file), "utf8"));
    return PilotPackSchema.parse(raw);
  });

  const tasksRaw = JSON.parse(
    fs.readFileSync(path.join(galleryDir, "benchmarks/tasks.json"), "utf8")
  ) as unknown[];
  const benchmarkTasks = tasksRaw.map((t) => BenchmarkTaskSchema.parse(t));

  const loaded: LoadedGalleryCatalog = {
    taxonomy: taxonomyRaw,
    entries,
    bundles: bundlesRaw,
    pilotPacks,
    benchmarkTasks,
  };

  if (!customGalleryDir) {
    cachedCatalog = loaded;
  }

  return loaded;
}
