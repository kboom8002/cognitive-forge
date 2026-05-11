/**
 * DB row types mirroring domain_packs, domain_pack_versions,
 * domain_pack_assets tables. No Supabase import — pure TypeScript.
 */

export type PackStatus = "draft" | "published" | "deprecated" | "archived";
export type VisibilityLevel = "public" | "workspace" | "private";
export type AssetType = "app" | "casepack" | "bridge" | "graph";

export interface DomainPackRow {
  id: string;
  workspace_id: string | null;
  key: string;
  status: PackStatus;
  visibility: VisibilityLevel;
  primary_app_slug: string;
  created_at: string;
  updated_at: string;
}

export interface DomainPackVersionRow {
  id: string;
  domain_pack_id: string;
  version: string;
  /** FORBIDDEN PUBLIC KEY — service role only. */
  manifest_json: unknown;
  is_current: boolean;
  created_at: string;
}

export interface DomainPackAssetRow {
  id: string;
  domain_pack_id: string;
  asset_type: AssetType;
  asset_key: string;
  created_at: string;
}

// ── Input shapes ──────────────────────────────────────────────────────────────

export interface CreateDomainPackInput {
  workspace_id?: string | null;
  key: string;
  status?: PackStatus;
  visibility?: VisibilityLevel;
  primary_app_slug: string;
}

export interface CreateDomainPackVersionInput {
  domain_pack_id: string;
  version: string;
  /** Full DomainPackManifest JSON — validated before storage. */
  manifest_json: unknown;
}

export interface CreateAssetInput {
  domain_pack_id: string;
  asset_type: AssetType;
  asset_key: string;
}

export interface ListDomainPacksOpts {
  workspace_id?: string;
  status?: PackStatus;
  visibility?: VisibilityLevel;
}
