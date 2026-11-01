/**
 * @cognitive-forge/domain-packs
 *
 * Domain Pack manifests, asset registry, and install lifecycle.
 *
 * ISOLATION RULES:
 *   ✓ May import @cognitive-forge/core
 *   ✗ Must NOT import React, Next.js, or Supabase
 *   ✗ Must NOT import @cognitive-forge/runtime, bridge, ui-forge
 *   ✗ Must NOT import apps/web
 */

export { CORE_VERSION } from "@cognitive-forge/core";

export const DOMAIN_PACKS_VERSION = "0.0.1" as const;

// ── DB types ──────────────────────────────────────────────────────────────────
export type {
  DomainPackRow,
  DomainPackVersionRow,
  DomainPackAssetRow,
  PackStatus,
  VisibilityLevel,
  AssetType,
  CreateDomainPackInput,
  CreateDomainPackVersionInput,
  CreateAssetInput,
  ListDomainPacksOpts,
} from "./types/db";

// ── Repository ────────────────────────────────────────────────────────────────
export type { IDomainPackStore } from "./repository/domain-pack.repo";
export { DomainPackRepository } from "./repository/domain-pack.repo";

// ── Service ───────────────────────────────────────────────────────────────────
export { DomainPackService } from "./service/domain-pack.service";
export type {
  CreateDomainPackParams,
  CreateVersionParams,
  ValidationResult,
} from "./service/domain-pack.service";

// ── Sanitizers ────────────────────────────────────────────────────────────────
export { sanitizePackManifest } from "./public-pack-sanitizer";
export type { PublicPackSummary } from "./public-pack-sanitizer";

// ── Gallery v2.0 Catalog, Listing, Fork, Comparison & Matching Services ───────
export {
  loadGalleryCatalog,
} from "./gallery/catalog-loader";
export type {
  TaxonomyCategory,
  GalleryTaxonomy,
  GalleryBundle,
  LoadedGalleryCatalog,
} from "./gallery/catalog-loader";

export {
  GalleryV2Service,
} from "./gallery/gallery-service";
export type {
  ForkPolicyType,
  ReleaseGalleryMeta,
  ListGalleryListingsQuery,
} from "./gallery/gallery-service";

export {
  ForkV2Service,
} from "./gallery/fork-service";
export type {
  ForkedChildDraftPack,
} from "./gallery/fork-service";

export {
  ComparisonV2Service,
} from "./gallery/comparison-service";
export type {
  CandidateRunDetail,
  ComparisonConfigDiff,
  ReleaseFeedbackEntry,
} from "./gallery/comparison-service";

export {
  MatchingV2Service,
} from "./gallery/matching-service";

