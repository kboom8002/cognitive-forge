/**
 * GET /api/public/graph-runs/:id
 *
 * Fetches the status and sanitized final output of a previously executed
 * graph run. Used by the UI to poll for completion or re-display results.
 *
 * Security rules:
 * - Returns ONLY sanitized final_output (FORBIDDEN_PUBLIC_KEYS stripped).
 * - NEVER returns: input_json, bridge payloads, accumulated_context,
 *   node_results, token counts, repair_attempts, trace_payload.
 * - Does NOT require authentication — the graph_run_id itself is the
 *   access token (UUIDs are non-guessable).
 *
 * Flow:
 * 1. Read :id param.
 * 2. Fetch graph_run row by id.
 * 3. Sanitize final_output through PublicGraphRunSanitizer.
 * 4. Return PublicGraphRunRecord.
 */

import { NextResponse } from "next/server";
import { apiSuccess, apiError, handleRouteError } from "../../../../../lib/api/response";
import { createServiceClient } from "../../../../../lib/supabase/client";
import { sanitizeGraphRunResult } from "@cognitive-forge/runtime";
import { AppError, AppErrorCode } from "@cognitive-forge/core";
import { deepSanitize } from "@cognitive-forge/validation";

type Params = Promise<{ id: string }>;

export async function GET(
  _req: Request,
  { params }: { params: Params }
): Promise<NextResponse> {
  try {
    const { id } = await params;

    if (!id || typeof id !== "string" || id.trim().length === 0) {
      return apiError("VALIDATION_ERROR", "graph-run id is required", 400);
    }

    const db = createServiceClient();

    // Fetch only safe fields — never include input_json or raw payloads
    const { data: row, error } = await db
      .from("graph_runs")
      .select("id, status, graph_key, final_output_json, node_count, completed_at, created_at")
      .eq("id", id.trim())
      .maybeSingle();

    if (error) {
      throw new AppError(AppErrorCode.INTERNAL_ERROR, `DB error fetching graph run: ${error.message}`);
    }
    if (!row) {
      return apiError("NOT_FOUND", `Graph run "${id}" not found`, 404);
    }

    // Sanitize the final_output before returning
    // Build a synthetic "result" shape that sanitizeGraphRunResult can consume
    const syntheticResult = {
      status:          (row.status as "success" | "failed" | "partial") ?? "failed",
      final_output:    (row.final_output_json as Record<string, unknown>) ?? {},
      validation:      { status: row.status === "success" ? "pass" : "fail" },
      completed_nodes: [] as string[],   // Node IDs not stored on graph_runs row
    };

    const publicResult = sanitizeGraphRunResult(syntheticResult, row.id as string);

    return apiSuccess(deepSanitize({
      ...publicResult,
      // Supplement with timestamps for UI polling
      completed_at: row.completed_at ?? null,
      created_at:   row.created_at,
    }));

  } catch (err) {
    return handleRouteError(err);
  }
}
