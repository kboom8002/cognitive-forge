/**
 * DB row types for casepack_graphs, graph_versions, and apps tables.
 * No Supabase import — pure TypeScript.
 */

// ── Graphs ────────────────────────────────────────────────────────────────────

export type GraphStatus = "draft" | "published" | "deprecated" | "archived";

export interface GraphRow {
  id: string;
  workspace_id: string | null;
  key: string;
  status: GraphStatus;
  /** Denormalised entry_node id for fast routing. */
  entry_node: string;
  /** Denormalised terminal node ids. */
  final_nodes: string[];
  created_at: string;
  updated_at: string;
}

export interface GraphVersionRow {
  id: string;
  graph_id: string;
  version: string;
  /** FORBIDDEN PUBLIC KEY — service role only. */
  graph_json: unknown;
  is_current: boolean;
  created_at: string;
}

export interface CreateGraphInput {
  workspace_id?: string | null;
  key: string;
  status?: GraphStatus;
  entry_node: string;
  final_nodes: string[];
}

export interface CreateGraphVersionInput {
  graph_id: string;
  version: string;
  /** Full CasePackGraphSchema JSON — validated before storage. */
  graph_json: unknown;
}

export interface ListGraphsOpts {
  workspace_id?: string;
  status?: GraphStatus;
}

// ── Apps ──────────────────────────────────────────────────────────────────────

export type AppType = "casepack" | "graph";
export type AppVisibility = "public" | "workspace" | "private";

export interface AppRow {
  id: string;
  workspace_id: string | null;
  slug: string;
  title: string;
  description: string | null;
  type: AppType;
  /** Non-null when type = 'casepack'. */
  casepack_key: string | null;
  /** Non-null when type = 'graph'. */
  graph_key: string | null;
  visibility: AppVisibility;
  pack_key: string | null;
  extra: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateAppInput {
  workspace_id?: string | null;
  slug: string;
  title: string;
  description?: string;
  type: AppType;
  casepack_key?: string | null;
  graph_key?: string | null;
  visibility?: AppVisibility;
  pack_key?: string | null;
  extra?: Record<string, unknown>;
}

export interface ListAppsOpts {
  workspace_id?: string;
  type?: AppType;
  visibility?: AppVisibility;
}
