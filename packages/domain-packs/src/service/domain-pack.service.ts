/**
 * DomainPackService — orchestrates Domain Pack lifecycle with Zod validation.
 *
 * Responsibilities:
 * - Validates manifest JSON against DomainPackManifestSchema before storage.
 * - Enforces key format rules.
 * - Prevents duplicate keys.
 * - Extracts asset list from manifest and syncs domain_pack_assets table.
 * - Manages current version promotion.
 * - Exposes validation endpoint logic (validate without persisting).
 *
 * Does NOT: execute packs, call AI providers, or talk to Supabase directly.
 */

import {
  DomainPackManifestSchema,
  AppError,
  AppErrorCode,
  safeParseOrThrow,
} from "@cognitive-forge/core";

import type { DomainPackRepository } from "../repository/domain-pack.repo";
import type {
  DomainPackRow,
  DomainPackVersionRow,
  DomainPackAssetRow,
  ListDomainPacksOpts,
  CreateAssetInput,
} from "../types/db";

const PACK_KEY_RE = /^pack\.[a-z0-9_]+\.v[0-9]+$/;

// ── Param shapes ──────────────────────────────────────────────────────────────

export interface CreateDomainPackParams {
  workspace_id?: string | null;
  key: string;
  status?: "draft" | "published";
  visibility?: "public" | "workspace" | "private";
  primary_app_slug: string;
}

export interface CreateVersionParams {
  version: string;
  /** Full DomainPackManifest JSON — validated against DomainPackManifestSchema. */
  manifest_json: unknown;
  set_current?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ── Service ───────────────────────────────────────────────────────────────────

export class DomainPackService {
  constructor(private readonly repo: DomainPackRepository) {}

  // ── List ────────────────────────────────────────────────────────────────────

  list(opts: ListDomainPacksOpts = {}): Promise<DomainPackRow[]> {
    return this.repo.list(opts);
  }

  // ── Get by ID ───────────────────────────────────────────────────────────────

  async getById(id: string): Promise<DomainPackRow> {
    const pack = await this.repo.findById(id);
    if (!pack) {
      throw new AppError(AppErrorCode.NOT_FOUND, `Domain Pack "${id}" not found`);
    }
    return pack;
  }

  // ── List apps for a pack (safe public metadata) ──────────────────────────────

  async listPackApps(packId: string): Promise<DomainPackAssetRow[]> {
    await this.getById(packId); // throws NOT_FOUND if missing
    const assets = await this.repo.listAssets(packId);
    return assets.filter((a) => a.asset_type === "app");
  }

  // ── Create parent row ───────────────────────────────────────────────────────

  async create(params: CreateDomainPackParams): Promise<DomainPackRow> {
    if (!PACK_KEY_RE.test(params.key)) {
      throw new AppError(
        AppErrorCode.VALIDATION_ERROR,
        `Invalid Domain Pack key "${params.key}". Expected: pack.<name>.v<version>`
      );
    }

    const existing = await this.repo.findByKey(params.key);
    if (existing) {
      throw new AppError(
        AppErrorCode.VALIDATION_ERROR,
        `Domain Pack with key "${params.key}" already exists (id: ${existing.id})`
      );
    }

    return this.repo.create({
      workspace_id:     params.workspace_id ?? null,
      key:              params.key,
      status:           params.status ?? "draft",
      visibility:       params.visibility ?? "workspace",
      primary_app_slug: params.primary_app_slug,
    });
  }

  // ── Validate manifest without persisting (validation endpoint) ────────────

  validateManifest(manifest_json: unknown): ValidationResult {
    const result = DomainPackManifestSchema.safeParse(manifest_json);
    if (result.success) {
      return { valid: true, errors: [] };
    }
    return {
      valid:  false,
      errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }

  // ── Create version row + sync assets ────────────────────────────────────────

  async createVersion(
    packId: string,
    params: CreateVersionParams
  ): Promise<DomainPackVersionRow> {
    const pack = await this.repo.findById(packId);
    if (!pack) {
      throw new AppError(AppErrorCode.NOT_FOUND, `Domain Pack "${packId}" not found`);
    }

    // Validate and parse manifest with DomainPackManifestSchema
    const manifest = safeParseOrThrow(DomainPackManifestSchema, params.manifest_json);

    // Create the version row
    const version = await this.repo.createVersion({
      domain_pack_id: packId,
      version:        params.version,
      manifest_json:  params.manifest_json,
    });

    // Sync domain_pack_assets from manifest (replaces previous asset rows)
    const assetInputs: CreateAssetInput[] = [
      // App assets
      ...manifest.assets.apps.map((app) => ({
        domain_pack_id: packId,
        asset_type:     "app" as const,
        asset_key:      app.slug,
      })),
      // CasePack assets
      ...manifest.assets.casepacks.map((key) => ({
        domain_pack_id: packId,
        asset_type:     "casepack" as const,
        asset_key:      key,
      })),
      // Bridge assets (optional)
      ...(manifest.assets.bridges ?? []).map((key) => ({
        domain_pack_id: packId,
        asset_type:     "bridge" as const,
        asset_key:      key,
      })),
      // Graph assets (optional)
      ...(manifest.assets.graphs ?? []).map((key) => ({
        domain_pack_id: packId,
        asset_type:     "graph" as const,
        asset_key:      key,
      })),
    ];

    await this.repo.replaceAssets(packId, assetInputs);

    if (params.set_current) {
      await this.repo.promoteVersion(packId, version.id);
    }

    return version;
  }

  // ── Get version ─────────────────────────────────────────────────────────────

  async getVersion(versionId: string): Promise<DomainPackVersionRow> {
    const version = await this.repo.findVersionById(versionId);
    if (!version) {
      throw new AppError(
        AppErrorCode.NOT_FOUND,
        `Domain Pack version "${versionId}" not found`
      );
    }
    return version;
  }
}
