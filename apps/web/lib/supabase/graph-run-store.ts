/**
 * SupabaseGraphRunStore — implements IGraphRunStore using @supabase/supabase-js.
 *
 * Creates and updates graph_runs rows.
 * Lives in apps/web — the only layer allowed to import Supabase directly.
 *
 * SECURITY: final_output_json is stored but only ever returned through
 * PublicGraphRunSanitizer — never raw.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { IGraphRunStore } from "@cognitive-forge/runtime";
import { AppError, AppErrorCode } from "@cognitive-forge/core";

function assertNoError(error: unknown, context: string): void {
  if (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new AppError(AppErrorCode.INTERNAL_ERROR, `SupabaseGraphRunStore.${context}: ${msg}`);
  }
}

/**
 * A minimal read-back shape for GET /api/public/graph-runs/:id.
 * Only safe fields — never includes raw json blobs.
 */
export interface GraphRunReadback {
  id:                string;
  status:            string;
  graph_key:         string;
  final_output_json: Record<string, unknown> | null;
  node_count:        number | null;
  completed_at:      string | null;
  created_at:        string;
}

export class SupabaseGraphRunStore implements IGraphRunStore {
  constructor(private readonly db: SupabaseClient) {}

  /**
   * Creates a new graph_runs row with status=pending.
   * Returns the generated UUID.
   */
  async create(params: {
    workspace_id: string;
    graph_key:    string;
    user_id?:     string | undefined;
    input_json:   Record<string, unknown>;
  }): Promise<string> {
    const { data, error } = await this.db
      .from("graph_runs")
      .insert({
        workspace_id: params.workspace_id,
        graph_key:    params.graph_key,
        user_id:      params.user_id ?? null,
        status:       "pending",
        input_json:   params.input_json,
      })
      .select("id")
      .single();

    assertNoError(error, "create");
    if (!data?.id) {
      throw new AppError(AppErrorCode.INTERNAL_ERROR, "SupabaseGraphRunStore.create: no id returned");
    }
    return data.id as string;
  }

  /**
   * Updates an existing graph_runs row.
   * Only provided fields are updated.
   */
  async update(
    graphRunId: string,
    params: {
      status:             string;
      final_output_json?: Record<string, unknown> | undefined;
      completed_at?:      string | undefined;
      node_count?:        number | undefined;
    }
  ): Promise<void> {
    const patch: Record<string, unknown> = { status: params.status };

    if (params.final_output_json !== undefined) patch.final_output_json = params.final_output_json;
    if (params.completed_at      !== undefined) patch.completed_at      = params.completed_at;
    if (params.node_count        !== undefined) patch.node_count        = params.node_count;

    const { error } = await this.db
      .from("graph_runs")
      .update(patch)
      .eq("id", graphRunId);

    assertNoError(error, "update");
  }

  /**
   * Fetches a completed graph_runs row by ID.
   * Returns null if not found.
   * NEVER returns input_json (may contain user PII).
   */
  async findById(id: string): Promise<GraphRunReadback | null> {
    const { data, error } = await this.db
      .from("graph_runs")
      .select("id, status, graph_key, final_output_json, node_count, completed_at, created_at")
      .eq("id", id)
      .maybeSingle();

    assertNoError(error, "findById");
    return data as GraphRunReadback | null;
  }
}
