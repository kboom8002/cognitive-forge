/**
 * SupabaseDomainPackStore — implements IDomainPackStore using @supabase/supabase-js.
 * Lives in apps/web (only layer allowed to import Supabase).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { IDomainPackStore } from "@cognitive-forge/domain-packs";
import type {
  DomainPackRow,
  DomainPackVersionRow,
  DomainPackAssetRow,
  CreateDomainPackInput,
  CreateDomainPackVersionInput,
  CreateAssetInput,
  ListDomainPacksOpts,
} from "@cognitive-forge/domain-packs";
import { AppError, AppErrorCode } from "@cognitive-forge/core";

function assertNoError(error: unknown, ctx: string): void {
  if (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new AppError(AppErrorCode.INTERNAL_ERROR, `${ctx}: ${msg}`);
  }
}

const PACK_SAFE_COLS =
  "id, workspace_id, key, status, visibility, primary_app_slug, created_at, updated_at";

export class SupabaseDomainPackStore implements IDomainPackStore {
  constructor(private readonly db: SupabaseClient) {}

  async findById(id: string): Promise<DomainPackRow | null> {
    const { data, error } = await this.db
      .from("domain_packs")
      .select(PACK_SAFE_COLS)
      .eq("id", id)
      .maybeSingle();
    assertNoError(error, "findById");
    return data as DomainPackRow | null;
  }

  async findByKey(key: string): Promise<DomainPackRow | null> {
    const { data, error } = await this.db
      .from("domain_packs")
      .select(PACK_SAFE_COLS)
      .eq("key", key)
      .maybeSingle();
    assertNoError(error, "findByKey");
    return data as DomainPackRow | null;
  }

  async list(opts: ListDomainPacksOpts): Promise<DomainPackRow[]> {
    let q = this.db.from("domain_packs").select(PACK_SAFE_COLS);
    if (opts.workspace_id) q = q.eq("workspace_id", opts.workspace_id);
    if (opts.status)       q = q.eq("status", opts.status);
    if (opts.visibility)   q = q.eq("visibility", opts.visibility);
    const { data, error } = await q.order("created_at", { ascending: false });
    assertNoError(error, "list");
    return (data ?? []) as DomainPackRow[];
  }

  async create(input: CreateDomainPackInput): Promise<DomainPackRow> {
    const { data, error } = await this.db
      .from("domain_packs")
      .insert({
        workspace_id:     input.workspace_id ?? null,
        key:              input.key,
        status:           input.status ?? "draft",
        visibility:       input.visibility ?? "workspace",
        primary_app_slug: input.primary_app_slug,
      })
      .select(PACK_SAFE_COLS)
      .single();
    assertNoError(error, "create");
    return data as DomainPackRow;
  }

  async findVersionById(versionId: string): Promise<DomainPackVersionRow | null> {
    const { data, error } = await this.db
      .from("domain_pack_versions")
      .select("*")
      .eq("id", versionId)
      .maybeSingle();
    assertNoError(error, "findVersionById");
    return data as DomainPackVersionRow | null;
  }

  async findCurrentVersion(packId: string): Promise<DomainPackVersionRow | null> {
    const { data, error } = await this.db
      .from("domain_pack_versions")
      .select("*")
      .eq("domain_pack_id", packId)
      .eq("is_current", true)
      .maybeSingle();
    assertNoError(error, "findCurrentVersion");
    return data as DomainPackVersionRow | null;
  }

  async createVersion(input: CreateDomainPackVersionInput): Promise<DomainPackVersionRow> {
    const { data, error } = await this.db
      .from("domain_pack_versions")
      .insert({
        domain_pack_id: input.domain_pack_id,
        version:        input.version,
        manifest_json:  input.manifest_json,
        is_current:     false,
      })
      .select("*")
      .single();
    assertNoError(error, "createVersion");
    return data as DomainPackVersionRow;
  }

  async unsetCurrentVersions(packId: string): Promise<void> {
    const { error } = await this.db
      .from("domain_pack_versions")
      .update({ is_current: false })
      .eq("domain_pack_id", packId)
      .eq("is_current", true);
    assertNoError(error, "unsetCurrentVersions");
  }

  async setVersionCurrent(versionId: string): Promise<void> {
    const { error } = await this.db
      .from("domain_pack_versions")
      .update({ is_current: true })
      .eq("id", versionId);
    assertNoError(error, "setVersionCurrent");
  }

  async listAssets(packId: string): Promise<DomainPackAssetRow[]> {
    const { data, error } = await this.db
      .from("domain_pack_assets")
      .select("*")
      .eq("domain_pack_id", packId)
      .order("asset_type");
    assertNoError(error, "listAssets");
    return (data ?? []) as DomainPackAssetRow[];
  }

  async createAsset(input: CreateAssetInput): Promise<DomainPackAssetRow> {
    const { data, error } = await this.db
      .from("domain_pack_assets")
      .insert(input)
      .select("*")
      .single();
    assertNoError(error, "createAsset");
    return data as DomainPackAssetRow;
  }

  async deleteAssets(packId: string): Promise<void> {
    const { error } = await this.db
      .from("domain_pack_assets")
      .delete()
      .eq("domain_pack_id", packId);
    assertNoError(error, "deleteAssets");
  }
}
