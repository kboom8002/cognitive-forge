/**
 * PublicGraphRunSanitizer — strips all forbidden / internal fields from
 * a SequentialGraphRunner result before sending it to a public API caller.
 *
 * The graph runner's GraphRunResult contains internal-only fields:
 *   - node_results         (raw per-node outputs, bridges, trace)
 *   - total_tokens_in/out  (telemetry — not public)
 *   - total_repair_attempts
 *
 * This module selects ONLY the fields safe to return to the browser.
 *
 * Defence-in-depth: Also strips any key matching FORBIDDEN_PUBLIC_KEYS
 * from final_output regardless of how it got there.
 */

import type { ValidationReport } from "@cognitive-forge/core";
import { deepSanitize } from "@cognitive-forge/validation";
import type { GraphRunResult } from "../runner/sequential-graph-runner";
import type { PublicTraceSummary } from "../trace/trace-summary-builder";

import { FORBIDDEN_PUBLIC_KEYS } from "@cognitive-forge/validation";

// ── Pre-compute forbidden key set ────────────────────────────────────────────

const FORBIDDEN_SET = new Set<string>(FORBIDDEN_PUBLIC_KEYS);

// ── Public Graph Run DTO ──────────────────────────────────────────────────────

/**
 * The response body returned by POST /api/public/apps/:slug/graph-run.
 *
 * SECURITY: Must never include:
 *   - node_results (raw per-node outputs)
 *   - handoff payloads (bridge_output_json, source_output_json, target_input_json)
 *   - accumulated context
 *   - trace payloads
 *   - repair attempts
 *   - execution plans
 *   - token counts
 */
export interface PublicGraphRunResult {
  /** Overall graph execution status. */
  status:         "success" | "failed" | "partial";
  /** Sanitized final output from the terminal node. */
  final_output:   Record<string, unknown>;
  /** Number of nodes that completed successfully. */
  completed_node_count: number;
  /** User-friendly progress description. */
  progress_label: string;
  /**
   * Node labels for display (safe: id + label only).
   * Internal node outputs are NOT included.
   */
  completed_nodes: string[];
  /**
   * Validation status of the final output.
   * Only the status string is exposed (not raw error objects).
   */
  validation_status: "pass" | "fail" | "warning";
  /** Human-readable timeline of what happened, safe for public. */
  trace_summary?: PublicTraceSummary[] | undefined;
}

/**
 * The response body returned by GET /api/public/graph-runs/:id.
 * Same shape as PublicGraphRunResult with an id field.
 */
export interface PublicGraphRunRecord extends PublicGraphRunResult {
  id: string;
}

// ── Sanitizer ─────────────────────────────────────────────────────────────────

/**
 * Strips all internal/forbidden fields from a GraphRunResult before
 * sending it to a public API caller.
 *
 * @param result     - Raw result from runSequentialGraph.
 * @param graphRunId - The graph_runs row UUID (included for tracking).
 * @returns          PublicGraphRunResult (safe for public API response).
 */
export function sanitizeGraphRunResult(
  result: {
    status:         "success" | "failed" | "partial";
    final_output:   Record<string, unknown>;
    validation:     { status: string };
    completed_nodes: string[];
    trace_summary?: any[];
  },
  graphRunId: string
): PublicGraphRunRecord {
  // Strip forbidden keys from final_output (defence-in-depth)
  const sanitizedOutput: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(result.final_output)) {
    if (!FORBIDDEN_SET.has(key)) {
      sanitizedOutput[key] = value;
    }
  }

  const completedCount = result.completed_nodes.length;
  const progressLabel  = buildProgressLabel(result.status, completedCount);

  return {
    id:                   graphRunId,
    status:               result.status,
    final_output:         sanitizedOutput,
    completed_node_count: completedCount,
    progress_label:       progressLabel,
    completed_nodes:      result.completed_nodes,
    validation_status:    (result.validation.status as "pass" | "fail" | "warning") ?? "fail",
    trace_summary:        result.trace_summary,
  };
}

// ── Progress label builder ────────────────────────────────────────────────────

function buildProgressLabel(
  status:         "success" | "failed" | "partial",
  completedCount: number
): string {
  switch (status) {
    case "success":
      return `Completed ${completedCount} step${completedCount !== 1 ? "s" : ""} successfully`;
    case "partial":
      return `Partially completed — ${completedCount} step${completedCount !== 1 ? "s" : ""} finished before an error occurred`;
    case "failed":
      return completedCount > 0
        ? `Failed after completing ${completedCount} step${completedCount !== 1 ? "s" : ""}`
        : "Failed to start — please check your input and try again";
    default:
      return "Processing...";
  }
}
