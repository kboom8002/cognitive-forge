/**
 * POST /api/public/apps/:slug/graph-run
 *
 * Executes a public Graph app sequentially through SequentialGraphRunner
 * and returns sanitized final_output + progress information.
 *
 * Security rules:
 * - App must be public or unlisted.
 * - graph_version_id is ALWAYS resolved server-side — never accepted from client.
 * - All MAOs and Bridge definitions are resolved server-side before execution.
 * - Output is sanitized by PublicGraphRunSanitizer.
 * - FORBIDDEN fields are NEVER returned.
 * - node_results, accumulated_context, bridge payloads, token counts are stripped.
 *
 * Flow:
 * 1. Parse and validate request body (reject forbidden fields from client).
 * 2. Resolve app by slug → verify public/unlisted → verify type=graph.
 * 3. Resolve current graph_version server-side → parse graph_json.
 * 4. Resolve all node MAOs server-side.
 * 5. Resolve all bridge definitions server-side.
 * 6. Execute via SequentialGraphRunner (publicMode=true).
 * 7. Sanitize result via PublicGraphRunSanitizer.
 * 8. Return sanitized PublicGraphRunResult.
 */

import { NextResponse } from "next/server";
import { apiSuccess, apiError, handleRouteError } from "../../../../../../lib/api/response";
import { createServiceClient } from "../../../../../../lib/supabase/client";
import { createGraphRuntimeComponents } from "../../../../../../lib/api/runtime-factory";
import { runSequentialGraph, sanitizeGraphRunResult } from "@cognitive-forge/runtime";
import {
  CasePackMAOSchema,
  CasePackGraphSchema,
  AppError,
  AppErrorCode,
} from "@cognitive-forge/core";
import type { CasePackMAO, CasePackGraph, BridgeCasePack } from "@cognitive-forge/core";
import { deepSanitize } from "@cognitive-forge/validation";

type Params = Promise<{ slug: string }>;

export async function POST(
  req: Request,
  { params }: { params: Params }
): Promise<NextResponse> {
  try {
    const { slug } = await params;

    // ── 1. Parse request body ─────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return apiError("VALIDATION_ERROR", "Request body must be valid JSON", 400);
    }

    const userInput = (body.input ?? {}) as Record<string, unknown>;

    // Guard: never accept version or run IDs from the client
    const forbiddenClientFields = [
      "graph_version_id", "version_id", "graph_run_id",
      "casepack_version_id", "bridge_key",
    ];
    for (const field of forbiddenClientFields) {
      if (field in body) {
        return apiError(
          "VALIDATION_ERROR",
          `"${field}" must not be supplied by the client — it is resolved server-side`,
          400
        );
      }
    }

    const db = createServiceClient();

    // ── 2. Resolve app by slug ────────────────────────────────────────────────
    const { data: app, error: appErr } = await db
      .from("apps")
      .select("id, slug, title, type, graph_key, visibility")
      .eq("slug", slug)
      .maybeSingle();

    if (appErr) {
      throw new AppError(AppErrorCode.INTERNAL_ERROR, `DB error resolving app: ${appErr.message}`);
    }
    if (!app) {
      return apiError("NOT_FOUND", `App "${slug}" not found`, 404);
    }
    if (app.visibility !== "public" && app.visibility !== "unlisted") {
      return apiError("FORBIDDEN", "This app is not publicly accessible", 403);
    }

    // Verify app type
    if (app.type !== "graph") {
      return apiError(
        "VALIDATION_ERROR",
        `App "${slug}" is type "${app.type}". Use /run for casepack apps.`,
        400
      );
    }
    if (!app.graph_key) {
      return apiError("VALIDATION_ERROR", `App "${slug}" has no graph_key configured`, 400);
    }

    // ── 3. Resolve current graph_version server-side ──────────────────────────
    const { data: graphRow, error: graphErr } = await db
      .from("casepack_graphs")
      .select("id, entry_node, final_nodes")
      .eq("key", app.graph_key)
      .maybeSingle();

    if (graphErr) {
      throw new AppError(AppErrorCode.INTERNAL_ERROR, `DB error resolving graph: ${graphErr.message}`);
    }
    if (!graphRow) {
      return apiError("NOT_FOUND", `Graph "${app.graph_key}" not found`, 404);
    }

    const { data: graphVersion, error: gvErr } = await db
      .from("graph_versions")
      .select("id, graph_json")
      .eq("graph_id", graphRow.id)
      .eq("is_current", true)
      .maybeSingle();

    if (gvErr) {
      throw new AppError(AppErrorCode.INTERNAL_ERROR, `DB error resolving graph version: ${gvErr.message}`);
    }
    if (!graphVersion?.graph_json) {
      return apiError("NOT_FOUND", `No published graph version found for app "${slug}"`, 404);
    }

    // Parse and validate the CasePackGraph schema
    const graphResult = CasePackGraphSchema.safeParse(graphVersion.graph_json);
    if (!graphResult.success) {
      throw new AppError(
        AppErrorCode.INTERNAL_ERROR,
        `Graph "${app.graph_key}" has an invalid schema: ${graphResult.error.message}`
      );
    }
    const graph = graphResult.data as CasePackGraph;

    // ── 4. Resolve all node MAOs server-side ──────────────────────────────────
    const maoMap = new Map<string, CasePackMAO>();

    for (const node of graph.nodes) {
      const { data: cp } = await db
        .from("casepacks")
        .select("id")
        .eq("key", node.casepack_key)
        .maybeSingle();

      if (!cp) {
        return apiError("NOT_FOUND", `CasePack "${node.casepack_key}" not found (node: "${node.id}")`, 404);
      }

      const { data: cpVersion } = await db
        .from("casepack_versions")
        .select("casepack_json")
        .eq("casepack_id", cp.id)
        .eq("is_current", true)
        .maybeSingle();

      if (!cpVersion?.casepack_json) {
        return apiError("NOT_FOUND", `No published version for CasePack "${node.casepack_key}"`, 404);
      }

      const maoResult = CasePackMAOSchema.safeParse(cpVersion.casepack_json);
      if (!maoResult.success) {
        throw new AppError(
          AppErrorCode.INTERNAL_ERROR,
          `CasePack "${node.casepack_key}" has an invalid MAO schema`
        );
      }
      maoMap.set(node.casepack_key, maoResult.data as CasePackMAO);
    }

    // ── 5. Resolve bridge definitions server-side ─────────────────────────────
    // Bridges are stored as CasePack versions with type="bridge" in the
    // casepack_versions table. Fallback: bridge_versions table if it exists.
    const bridgeMap = new Map<string, BridgeCasePack>();

    for (const edge of graph.edges) {
      if (!edge.bridge_key || bridgeMap.has(edge.bridge_key)) continue;

      const { data: bridgeCp } = await db
        .from("casepacks")
        .select("id")
        .eq("key", edge.bridge_key)
        .maybeSingle();

      if (bridgeCp) {
        const { data: bridgeVersion } = await db
          .from("casepack_versions")
          .select("casepack_json")
          .eq("casepack_id", bridgeCp.id)
          .eq("is_current", true)
          .maybeSingle();

        if (bridgeVersion?.casepack_json) {
          bridgeMap.set(edge.bridge_key, bridgeVersion.casepack_json as BridgeCasePack);
          continue;
        }
      }

      // Fallback: bridge_versions table (Sprint 08 schema may move bridges here)
      const { data: directBridge } = await db
        .from("bridge_versions")
        .select("bridge_json")
        .eq("bridge_key", edge.bridge_key)
        .eq("is_current", true)
        .maybeSingle();

      if (directBridge?.bridge_json) {
        bridgeMap.set(edge.bridge_key, directBridge.bridge_json as BridgeCasePack);
      }
      // If bridge not found, SequentialGraphRunner will return status=partial
      // with BRIDGE_MISSING — graceful degradation without throwing
    }

    // ── 6. Execute via SequentialGraphRunner ──────────────────────────────────
    const runtime = createGraphRuntimeComponents(db);

    const graphRunResult = await runSequentialGraph({
      graph,
      maoMap,
      bridgeMap,
      userInput,
      adapter:       runtime.adapter,
      traceWriter:   runtime.graphTraceWriter,
      usageWriter:   runtime.usageWriter,
      runStore:      runtime.runStore,
      graphRunStore: runtime.graphRunStore,
      workspace_id:  runtime.workspaceId,
      publicMode:    true,
    });

    // ── 7. Fetch Trace Summary ────────────────────────────────────────────────
    const { data: traces } = await db
      .from("runtime_trace_events")
      .select("*")
      .eq("run_id", graphRunResult.graph_run_id)
      .order("sequence", { ascending: true });

    let trace_summary: any[] = [];
    if (traces && traces.length > 0) {
      const { TraceSummaryBuilder } = await import("@cognitive-forge/runtime");
      trace_summary = TraceSummaryBuilder.buildPublicSummary(traces);
    }

    // ── 8. Sanitize and return ────────────────────────────────────────────────
    // PublicGraphRunSanitizer strips: node_results, token counts, repair attempts,
    // accumulated context, trace payloads, and all FORBIDDEN_PUBLIC_KEYS.
    const publicResult = sanitizeGraphRunResult(
      { ...graphRunResult, trace_summary }, 
      graphRunResult.graph_run_id
    );

    // Use 207 Multi-Status for partial results (some nodes completed, some failed)
    const httpStatus = graphRunResult.status === "success" ? 200 : 207;
    return apiSuccess(deepSanitize(publicResult), undefined, httpStatus);

  } catch (err) {
    if (err instanceof AppError && err.code === AppErrorCode.VALIDATION_ERROR) {
      return apiError(err.code, err.message, 400);
    }
    return handleRouteError(err);
  }
}
