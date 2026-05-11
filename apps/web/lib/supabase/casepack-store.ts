/**
 * SupabaseCasePackStore — implements ICasePackStore using @supabase/supabase-js.
 *
 * This is the only file in the monorepo that wires CasePack persistence to Supabase.
 * Lives in apps/web (the only layer allowed to import Supabase).
 *
 * Injected into CasePackRepository at the route-handler level.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ICasePackStore } from "@cognitive-forge/casepack";
import type {
  CasePackRow,
  CasePackVersionRow,
  CreateCasePackInput,
  CreateCasePackVersionInput,
  ListCasePacksOpts,
} from "@cognitive-forge/casepack";
import { AppError, AppErrorCode } from "@cognitive-forge/core";

function assertNoError(error: unknown, context: string): void {
  if (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new AppError(AppErrorCode.INTERNAL_ERROR, `${context}: ${msg}`);
  }
}

export class SupabaseCasePackStore implements ICasePackStore {
  constructor(private readonly db: SupabaseClient) {}

  async findById(id: string): Promise<CasePackRow | null> {
    const { data, error } = await this.db
      .from("casepacks")
      .select("id, workspace_id, key, status, visibility, created_at, updated_at")
      .eq("id", id)
      .maybeSingle();
    assertNoError(error, "findById");
    return data as CasePackRow | null;
  }

  async findByKey(key: string): Promise<CasePackRow | null> {
    const { data, error } = await this.db
      .from("casepacks")
      .select("id, workspace_id, key, status, visibility, created_at, updated_at")
      .eq("key", key)
      .maybeSingle();
    assertNoError(error, "findByKey");
    return data as CasePackRow | null;
  }

  async list(opts: ListCasePacksOpts): Promise<CasePackRow[]> {
    let q = this.db
      .from("casepacks")
      .select("id, workspace_id, key, status, visibility, created_at, updated_at");

    if (opts.workspace_id) q = q.eq("workspace_id", opts.workspace_id);
    if (opts.status)       q = q.eq("status", opts.status);
    if (opts.visibility)   q = q.eq("visibility", opts.visibility);

    const { data, error } = await q.order("created_at", { ascending: false });
    assertNoError(error, "list");
    return (data ?? []) as CasePackRow[];
  }

  async create(input: CreateCasePackInput): Promise<CasePackRow> {
    const { data, error } = await this.db
      .from("casepacks")
      .insert({
        workspace_id: input.workspace_id ?? null,
        key:          input.key,
        status:       input.status ?? "draft",
        visibility:   input.visibility ?? "workspace",
      })
      .select("id, workspace_id, key, status, visibility, created_at, updated_at")
      .single();
    assertNoError(error, "create");
    return data as CasePackRow;
  }

  async findVersionById(versionId: string): Promise<CasePackVersionRow | null> {
    const { data, error } = await this.db
      .from("casepack_versions")
      .select("*")
      .eq("id", versionId)
      .maybeSingle();
    assertNoError(error, "findVersionById");
    return data as CasePackVersionRow | null;
  }

  async findCurrentVersion(casepackId: string): Promise<CasePackVersionRow | null> {
    const { data, error } = await this.db
      .from("casepack_versions")
      .select("*")
      .eq("casepack_id", casepackId)
      .eq("is_current", true)
      .maybeSingle();
    assertNoError(error, "findCurrentVersion");
    return data as CasePackVersionRow | null;
  }

  async createVersion(input: CreateCasePackVersionInput): Promise<CasePackVersionRow> {
    const { data, error } = await this.db
      .from("casepack_versions")
      .insert({
        casepack_id:   input.casepack_id,
        version:       input.version,
        casepack_json: input.casepack_json,
        manifest_json: input.manifest_json ?? null,
        is_current:    false,
      })
      .select("*")
      .single();
    assertNoError(error, "createVersion");
    return data as CasePackVersionRow;
  }

  async unsetCurrentVersions(casepackId: string): Promise<void> {
    const { error } = await this.db
      .from("casepack_versions")
      .update({ is_current: false })
      .eq("casepack_id", casepackId)
      .eq("is_current", true);
    assertNoError(error, "unsetCurrentVersions");
  }

  async setVersionCurrent(versionId: string): Promise<void> {
    const { error } = await this.db
      .from("casepack_versions")
      .update({ is_current: true })
      .eq("id", versionId);
    assertNoError(error, "setVersionCurrent");
  }
}
