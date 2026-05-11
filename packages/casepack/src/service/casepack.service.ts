/**
 * CasePackService — orchestrates CasePack lifecycle with Zod validation.
 *
 * Responsibilities:
 * - Validates CasePack JSON against CasePackMAOSchema before storage.
 * - Enforces key format rules.
 * - Prevents duplicate keys.
 * - Manages current version promotion.
 * - Supports both atomic (single_casepack) and bridge CasePacks.
 *
 * Does NOT: execute packs, call AI providers, or talk to Supabase directly.
 */

import {
  CasePackMAOSchema,
  AppError,
  AppErrorCode,
  safeParseOrThrow,
} from "@cognitive-forge/core";

import type { CasePackRepository } from "../repository/casepack.repo";
import type {
  CasePackRow,
  CasePackVersionRow,
  CreateCasePackInput,
  ListCasePacksOpts,
} from "../types/db";

// ── Regex matching casepacks DB CHECK constraint ─────────────────────────────
const CASEPACK_KEY_RE = /^casepack\.[a-z0-9_]+\.v[0-9]+$/;

// ── Public param shapes ───────────────────────────────────────────────────────

export interface CreateCasePackParams {
  workspace_id?: string | null;
  key: string;
  status?: "draft" | "published";
  visibility?: "public" | "workspace" | "private";
}

export interface CreateVersionParams {
  version: string;
  /** Full CasePack-MAO JSON. Validated against CasePackMAOSchema. */
  casepack_json: unknown;
  manifest_json?: unknown;
  /** If true, promotes this version to is_current after creation. */
  set_current?: boolean;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class CasePackService {
  constructor(private readonly repo: CasePackRepository) {}

  // ── List ────────────────────────────────────────────────────────────────────

  list(opts: ListCasePacksOpts = {}): Promise<CasePackRow[]> {
    return this.repo.list(opts);
  }

  // ── Get by ID ───────────────────────────────────────────────────────────────

  async getById(id: string): Promise<CasePackRow> {
    const pack = await this.repo.findById(id);
    if (!pack) {
      throw new AppError(AppErrorCode.NOT_FOUND, `CasePack "${id}" not found`);
    }
    return pack;
  }

  // ── Create parent row ───────────────────────────────────────────────────────

  async create(params: CreateCasePackParams): Promise<CasePackRow> {
    // 1. Validate key format early (before hitting DB constraint)
    if (!CASEPACK_KEY_RE.test(params.key)) {
      throw new AppError(
        AppErrorCode.VALIDATION_ERROR,
        `Invalid CasePack key "${params.key}". Expected format: casepack.<name>.v<version>`
      );
    }

    // 2. Prevent duplicate keys
    const existing = await this.repo.findByKey(params.key);
    if (existing) {
      throw new AppError(
        AppErrorCode.VALIDATION_ERROR,
        `CasePack with key "${params.key}" already exists (id: ${existing.id})`
      );
    }

    // 3. Create metadata row (no casepack_json here — that's in versions)
    return this.repo.create({
      workspace_id: params.workspace_id ?? null,
      key: params.key,
      status: params.status ?? "draft",
      visibility: params.visibility ?? "workspace",
    });
  }

  // ── Create version row ──────────────────────────────────────────────────────

  async createVersion(
    casepackId: string,
    params: CreateVersionParams
  ): Promise<CasePackVersionRow> {
    // 1. Verify parent exists
    const pack = await this.repo.findById(casepackId);
    if (!pack) {
      throw new AppError(
        AppErrorCode.NOT_FOUND,
        `CasePack "${casepackId}" not found`
      );
    }

    // 2. Validate full CasePack-MAO JSON with Zod.
    //    Covers: W_watchouts, O_output_contract, runtime_contract execution_type
    //    (single_casepack, bridge_casepack, sequential_graph), ui_schema app_mode, etc.
    safeParseOrThrow(CasePackMAOSchema, params.casepack_json);

    // 3. Store the version row
    const version = await this.repo.createVersion({
      casepack_id: casepackId,
      version: params.version,
      casepack_json: params.casepack_json,
      manifest_json: params.manifest_json,
    });

    // 4. Optionally promote to current
    if (params.set_current) {
      await this.repo.promoteVersion(casepackId, version.id);
    }

    return version;
  }

  // ── Get version ─────────────────────────────────────────────────────────────

  async getVersion(versionId: string): Promise<CasePackVersionRow> {
    const version = await this.repo.findVersionById(versionId);
    if (!version) {
      throw new AppError(
        AppErrorCode.NOT_FOUND,
        `CasePack version "${versionId}" not found`
      );
    }
    return version;
  }
}
