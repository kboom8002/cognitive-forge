/**
 * SupabaseGraphStore + SupabaseAppStore — Supabase implementations.
 * Lives in apps/web (only layer allowed to import Supabase).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { IGraphStore, IAppStore } from "@cognitive-forge/casepack";
import type {
  GraphRow,
  GraphVersionRow,
  CreateGraphInput,
  CreateGraphVersionInput,
  ListGraphsOpts,
  AppRow,
  CreateAppInput,
  ListAppsOpts,
} from "@cognitive-forge/casepack";
import { AppError, AppErrorCode } from "@cognitive-forge/core";

function assertNoError(error: unknown, ctx: string): void {
  if (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new AppError(AppErrorCode.INTERNAL_ERROR, `${ctx}: ${msg}`);
  }
}

const GRAPH_SAFE = "id, workspace_id, key, status, entry_node, final_nodes, created_at, updated_at";
const APP_SAFE   = "id, workspace_id, slug, title, description, type, casepack_key, graph_key, visibility, pack_key, extra, created_at, updated_at";

// ── Graph store ───────────────────────────────────────────────────────────────

export class SupabaseGraphStore implements IGraphStore {
  constructor(private readonly db: SupabaseClient) {}

  async findById(id: string): Promise<GraphRow | null> {
    const { data, error } = await this.db.from("casepack_graphs").select(GRAPH_SAFE).eq("id", id).maybeSingle();
    assertNoError(error, "graph.findById");
    return data as GraphRow | null;
  }

  async findByKey(key: string): Promise<GraphRow | null> {
    const { data, error } = await this.db.from("casepack_graphs").select(GRAPH_SAFE).eq("key", key).maybeSingle();
    assertNoError(error, "graph.findByKey");
    return data as GraphRow | null;
  }

  async list(opts: ListGraphsOpts): Promise<GraphRow[]> {
    let q = this.db.from("casepack_graphs").select(GRAPH_SAFE);
    if (opts.workspace_id) q = q.eq("workspace_id", opts.workspace_id);
    if (opts.status)       q = q.eq("status", opts.status);
    const { data, error } = await q.order("created_at", { ascending: false });
    assertNoError(error, "graph.list");
    return (data ?? []) as GraphRow[];
  }

  async create(input: CreateGraphInput): Promise<GraphRow> {
    const { data, error } = await this.db
      .from("casepack_graphs")
      .insert({
        workspace_id: input.workspace_id ?? null,
        key:          input.key,
        status:       input.status ?? "draft",
        entry_node:   input.entry_node,
        final_nodes:  input.final_nodes,
      })
      .select(GRAPH_SAFE)
      .single();
    assertNoError(error, "graph.create");
    return data as GraphRow;
  }

  async findVersionById(versionId: string): Promise<GraphVersionRow | null> {
    const { data, error } = await this.db.from("graph_versions").select("*").eq("id", versionId).maybeSingle();
    assertNoError(error, "graph.findVersionById");
    return data as GraphVersionRow | null;
  }

  async findCurrentVersion(graphId: string): Promise<GraphVersionRow | null> {
    const { data, error } = await this.db.from("graph_versions").select("*").eq("graph_id", graphId).eq("is_current", true).maybeSingle();
    assertNoError(error, "graph.findCurrentVersion");
    return data as GraphVersionRow | null;
  }

  async createVersion(input: CreateGraphVersionInput): Promise<GraphVersionRow> {
    const { data, error } = await this.db
      .from("graph_versions")
      .insert({ graph_id: input.graph_id, version: input.version, graph_json: input.graph_json, is_current: false })
      .select("*")
      .single();
    assertNoError(error, "graph.createVersion");
    return data as GraphVersionRow;
  }

  async unsetCurrentVersions(graphId: string): Promise<void> {
    const { error } = await this.db.from("graph_versions").update({ is_current: false }).eq("graph_id", graphId).eq("is_current", true);
    assertNoError(error, "graph.unsetCurrentVersions");
  }

  async setVersionCurrent(versionId: string): Promise<void> {
    const { error } = await this.db.from("graph_versions").update({ is_current: true }).eq("id", versionId);
    assertNoError(error, "graph.setVersionCurrent");
  }
}

// ── App store ─────────────────────────────────────────────────────────────────

export class SupabaseAppStore implements IAppStore {
  constructor(private readonly db: SupabaseClient) {}

  async findById(id: string): Promise<AppRow | null> {
    const { data, error } = await this.db.from("apps").select(APP_SAFE).eq("id", id).maybeSingle();
    assertNoError(error, "app.findById");
    return data as AppRow | null;
  }

  async findBySlug(slug: string): Promise<AppRow | null> {
    const { data, error } = await this.db.from("apps").select(APP_SAFE).eq("slug", slug).maybeSingle();
    assertNoError(error, "app.findBySlug");
    return data as AppRow | null;
  }

  async list(opts: ListAppsOpts): Promise<AppRow[]> {
    let q = this.db.from("apps").select(APP_SAFE);
    if (opts.workspace_id) q = q.eq("workspace_id", opts.workspace_id);
    if (opts.type)         q = q.eq("type", opts.type);
    if (opts.visibility)   q = q.eq("visibility", opts.visibility);
    const { data, error } = await q.order("created_at", { ascending: false });
    assertNoError(error, "app.list");
    return (data ?? []) as AppRow[];
  }

  async create(input: CreateAppInput): Promise<AppRow> {
    const { data, error } = await this.db
      .from("apps")
      .insert({
        workspace_id: input.workspace_id ?? null,
        slug:         input.slug,
        title:        input.title,
        description:  input.description ?? null,
        type:         input.type,
        casepack_key: input.casepack_key ?? null,
        graph_key:    input.graph_key ?? null,
        visibility:   input.visibility ?? "workspace",
        pack_key:     input.pack_key ?? null,
        extra:        input.extra ?? {},
      })
      .select(APP_SAFE)
      .single();
    assertNoError(error, "app.create");
    return data as AppRow;
  }
}
