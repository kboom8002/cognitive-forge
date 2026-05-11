/**
 * SupabaseRunStore — implements IRunStore using @supabase/supabase-js.
 *
 * Creates and updates casepack_runs rows.
 * Lives in apps/web — the only layer allowed to import Supabase directly.
 *
 * The execution_plan stored internally is NEVER returned to public callers.
 * The PublicOutputSanitizer enforces this at the runtime layer.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { IRunStore } from "@cognitive-forge/runtime";
import { AppError, AppErrorCode } from "@cognitive-forge/core";

function assertNoError(error: unknown, context: string): void {
  if (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new AppError(AppErrorCode.INTERNAL_ERROR, `SupabaseRunStore.${context}: ${msg}`);
  }
}

export class SupabaseRunStore implements IRunStore {
  constructor(private readonly db: SupabaseClient) {}

  /**
   * Creates a new casepack_runs row with status=pending.
   * Returns the generated UUID for the run.
   */
  async create(params: {
    workspace_id: string;
    casepack_key: string;
    user_id?:     string | undefined;
    input_json:   Record<string, unknown>;
  }): Promise<string> {
    const { data, error } = await this.db
      .from("casepack_runs")
      .insert({
        workspace_id: params.workspace_id,
        casepack_key: params.casepack_key,
        user_id:      params.user_id ?? null,
        status:       "pending",
        input_json:   params.input_json,
      })
      .select("id")
      .single();

    assertNoError(error, "create");
    if (!data?.id) {
      throw new AppError(AppErrorCode.INTERNAL_ERROR, "SupabaseRunStore.create: no id returned");
    }
    return data.id as string;
  }

  /**
   * Updates an existing casepack_runs row.
   * Only provided fields are updated (partial update).
   */
  async update(
    runId: string,
    params: {
      status:           string;
      output_json?:     Record<string, unknown> | undefined;
      execution_plan?:  Record<string, unknown> | undefined;
      repair_attempts?: number | undefined;
      started_at?:      string | undefined;
      completed_at?:    string | undefined;
    }
  ): Promise<void> {
    const patch: Record<string, unknown> = { status: params.status };

    if (params.output_json    !== undefined) patch.output_json    = params.output_json;
    if (params.execution_plan !== undefined) patch.execution_plan = params.execution_plan;
    if (params.repair_attempts !== undefined) patch.repair_attempts = params.repair_attempts;
    if (params.started_at     !== undefined) patch.started_at     = params.started_at;
    if (params.completed_at   !== undefined) patch.completed_at   = params.completed_at;

    const { error } = await this.db
      .from("casepack_runs")
      .update(patch)
      .eq("id", runId);

    assertNoError(error, "update");
  }
}
