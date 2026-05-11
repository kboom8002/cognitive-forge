/**
 * GraphService — orchestrates Graph lifecycle with CasePackGraphSchema validation.
 * AppService  — orchestrates App lifecycle with AppObjectSchema validation.
 *
 * Responsibilities:
 * - Validates graph_json against CasePackGraphSchema before storage.
 * - Validates app object against AppObjectSchema before storage.
 * - Enforces XOR type rule: casepack app ↔ casepack_key, graph app ↔ graph_key.
 * - Manages current version promotion for graphs.
 *
 * Does NOT: execute graphs, call AI providers, or touch Supabase directly.
 */

import {
  CasePackGraphSchema,
  AppObjectSchema,
  AppError,
  AppErrorCode,
  safeParseOrThrow,
} from "@cognitive-forge/core";

import type { GraphRepository, AppRepository } from "../repository/graph-app.repo";
import type {
  GraphRow,
  GraphVersionRow,
  ListGraphsOpts,
  AppRow,
  ListAppsOpts,
  CreateAppInput,
} from "../types/graph-app-db";

const GRAPH_KEY_RE = /^graph\.[a-z0-9_]+\.v[0-9]+$/;

// ── Graph params ──────────────────────────────────────────────────────────────

export interface CreateGraphParams {
  workspace_id?: string | null;
  key: string;
  status?: "draft" | "published";
}

export interface CreateGraphVersionParams {
  version: string;
  /** Full CasePackGraphSchema JSON — validated before storage. */
  graph_json: unknown;
  set_current?: boolean;
}

// ── App params ────────────────────────────────────────────────────────────────

export interface CreateAppParams {
  workspace_id?: string | null;
  slug: string;
  title: string;
  description?: string;
  type: "casepack" | "graph";
  /** Required when type = 'casepack'. */
  casepack_key?: string;
  /** Required when type = 'graph'. */
  graph_key?: string;
  visibility?: "public" | "workspace" | "private";
  pack_key?: string;
  extra?: Record<string, unknown>;
}

// ── GraphService ──────────────────────────────────────────────────────────────

export class GraphService {
  constructor(private readonly repo: GraphRepository) {}

  list(opts: ListGraphsOpts = {}): Promise<GraphRow[]> {
    return this.repo.list(opts);
  }

  async getById(id: string): Promise<GraphRow> {
    const graph = await this.repo.findById(id);
    if (!graph) throw new AppError(AppErrorCode.NOT_FOUND, `Graph "${id}" not found`);
    return graph;
  }

  async create(params: CreateGraphParams): Promise<GraphRow> {
    if (!GRAPH_KEY_RE.test(params.key)) {
      throw new AppError(
        AppErrorCode.VALIDATION_ERROR,
        `Invalid graph key "${params.key}". Expected: graph.<name>.v<version>`
      );
    }
    const existing = await this.repo.findByKey(params.key);
    if (existing) {
      throw new AppError(
        AppErrorCode.VALIDATION_ERROR,
        `Graph with key "${params.key}" already exists (id: ${existing.id})`
      );
    }
    // entry_node and final_nodes are set when the first version is created.
    // Placeholder values satisfy the DB NOT NULL constraint until then.
    return this.repo.create({
      workspace_id: params.workspace_id ?? null,
      key:          params.key,
      status:       params.status ?? "draft",
      entry_node:   "__pending__",
      final_nodes:  ["__pending__"],
    });
  }

  async createVersion(graphId: string, params: CreateGraphVersionParams): Promise<GraphVersionRow> {
    const graph = await this.repo.findById(graphId);
    if (!graph) throw new AppError(AppErrorCode.NOT_FOUND, `Graph "${graphId}" not found`);

    // Validate the full graph JSON — enforces node/edge cross-references
    const parsed = safeParseOrThrow(CasePackGraphSchema, params.graph_json);

    const version = await this.repo.createVersion({
      graph_id:   graphId,
      version:    params.version,
      graph_json: params.graph_json,
    });

    if (params.set_current) {
      await this.repo.promoteVersion(graphId, version.id);
    }

    return version;
  }

  async getVersion(versionId: string): Promise<GraphVersionRow> {
    const v = await this.repo.findVersionById(versionId);
    if (!v) throw new AppError(AppErrorCode.NOT_FOUND, `Graph version "${versionId}" not found`);
    return v;
  }
}

// ── AppService ────────────────────────────────────────────────────────────────

export class AppService {
  constructor(private readonly repo: AppRepository) {}

  list(opts: ListAppsOpts = {}): Promise<AppRow[]> {
    return this.repo.list(opts);
  }

  async getById(id: string): Promise<AppRow> {
    const app = await this.repo.findById(id);
    if (!app) throw new AppError(AppErrorCode.NOT_FOUND, `App "${id}" not found`);
    return app;
  }

  async getBySlug(slug: string): Promise<AppRow> {
    const app = await this.repo.findBySlug(slug);
    if (!app) throw new AppError(AppErrorCode.NOT_FOUND, `App "${slug}" not found`);
    return app;
  }

  async create(params: CreateAppParams): Promise<AppRow> {
    // Validate with AppObjectSchema — enforces XOR type rule
    safeParseOrThrow(AppObjectSchema, {
      slug:         params.slug,
      title:        params.title,
      description:  params.description,
      type:         params.type,
      casepack_key: params.casepack_key,
      graph_key:    params.graph_key,
      visibility:   params.visibility ?? "workspace",
      pack_key:     params.pack_key,
      extra:        params.extra,
    });

    // Check for duplicate slug
    const existing = await this.repo.findBySlug(params.slug);
    if (existing) {
      throw new AppError(
        AppErrorCode.VALIDATION_ERROR,
        `App with slug "${params.slug}" already exists (id: ${existing.id})`
      );
    }

    const input: CreateAppInput = {
      workspace_id: params.workspace_id ?? null,
      slug:         params.slug,
      title:        params.title,
      ...(params.description !== undefined ? { description: params.description } : {}),
      type:         params.type,
      visibility:   params.visibility ?? "workspace",
      pack_key:     params.pack_key ?? null,
      extra:        params.extra ?? {},
      // XOR: only one key is set
      casepack_key: params.type === "casepack" ? (params.casepack_key ?? null) : null,
      graph_key:    params.type === "graph"    ? (params.graph_key    ?? null) : null,
    };

    return this.repo.create(input);
  }
}
