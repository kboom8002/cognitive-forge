/**
 * GET /api/public/apps/:slug
 *
 * Public-facing endpoint that resolves an app by slug and returns
 * sanitized contract data for the UI Forge renderer.
 *
 * SANITIZATION RULES:
 * - NEVER returns: casepack_json, graph_json, manifest_json, taskflow_cx,
 *   runtime_contract, model_policy, K_REF, bridge_output_json, etc.
 * - Returns only: app metadata + input_contract + output_contract + ui_schema
 * - For graph apps: additionally returns graph_nodes (id + label only)
 *
 * Resolution logic:
 * 1. Fetch app by slug → reject if not public/unlisted
 * 2. If type=casepack: fetch current casepack_version → extract contracts
 * 3. If type=graph: fetch current graph_version → extract node list →
 *    resolve entry node's CasePack for input_contract → resolve final
 *    node's CasePack for output_contract
 */

import { NextResponse } from "next/server";
import { apiSuccess, apiError, handleRouteError } from "../../../../../lib/api/response";
import { createServiceClient } from "../../../../../lib/supabase/client";
import { AppError, AppErrorCode } from "@cognitive-forge/core";
import { deepSanitize } from "@cognitive-forge/validation";

type Params = Promise<{ slug: string }>;

export async function GET(
  _req: Request,
  { params }: { params: Params }
): Promise<NextResponse> {
  try {
    const { slug } = await params;
    const db = createServiceClient();

    // ── 1. Resolve app by slug ──────────────────────────────────────────
    const { data: app, error: appErr } = await db
      .from("apps")
      .select("id, slug, title, description, type, casepack_key, graph_key, visibility, pack_key, extra")
      .eq("slug", slug)
      .maybeSingle();

    if (appErr) {
      throw new AppError(AppErrorCode.INTERNAL_ERROR, `DB error: ${appErr.message}`);
    }
    if (!app) {
      return apiError("NOT_FOUND", `App "${slug}" not found`, 404);
    }

    // Only serve public and unlisted apps
    if (app.visibility !== "public" && app.visibility !== "unlisted") {
      return apiError("FORBIDDEN", "This app is not publicly accessible", 403);
    }

    // ── 2. Resolve contracts based on app type ──────────────────────────
    if (app.type === "casepack" && app.casepack_key) {
      return await resolveCasepackApp(db, app);
    } else if (app.type === "graph" && app.graph_key) {
      return await resolveGraphApp(db, app);
    } else {
      return apiError("VALIDATION_ERROR", "App has invalid type/key configuration", 400);
    }
  } catch (err) {
    return handleRouteError(err);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveCasepackApp(db: any, app: any): Promise<NextResponse> {
  // Find parent CasePack row
  const { data: cp } = await db
    .from("casepacks")
    .select("id")
    .eq("key", app.casepack_key)
    .maybeSingle();

  if (!cp) {
    return apiError("NOT_FOUND", `CasePack "${app.casepack_key}" not found`, 404);
  }

  // Find current version
  const { data: version } = await db
    .from("casepack_versions")
    .select("casepack_json")
    .eq("casepack_id", cp.id)
    .eq("is_current", true)
    .maybeSingle();

  if (!version?.casepack_json) {
    return apiError("NOT_FOUND", "No published version found for this app", 404);
  }

  const mao = version.casepack_json as Record<string, unknown>;

  return apiSuccess(deepSanitize({
    slug:            app.slug,
    title:           app.title,
    description:     app.description,
    type:            app.type,
    pack_key:        app.pack_key,
    input_contract:  mao["input_contract"] ?? null,
    output_contract: mao["output_contract"] ?? null,
    ui_schema:       mao["ui_schema"] ?? null,
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveGraphApp(db: any, app: any): Promise<NextResponse> {
  // Find parent graph row
  const { data: graph } = await db
    .from("casepack_graphs")
    .select("id, entry_node, final_nodes")
    .eq("key", app.graph_key)
    .maybeSingle();

  if (!graph) {
    return apiError("NOT_FOUND", `Graph "${app.graph_key}" not found`, 404);
  }

  // Find current graph version
  const { data: graphVersion } = await db
    .from("graph_versions")
    .select("graph_json")
    .eq("graph_id", graph.id)
    .eq("is_current", true)
    .maybeSingle();

  if (!graphVersion?.graph_json) {
    return apiError("NOT_FOUND", "No published graph version found", 404);
  }

  const graphJson = graphVersion.graph_json as Record<string, unknown>;
  const nodes = (graphJson["nodes"] ?? []) as Array<{ id: string; label?: string; casepack_key: string }>;
  const entryNodeId = graph.entry_node as string;
  const finalNodeIds = (graph.final_nodes ?? []) as string[];

  // Resolve entry node's CasePack for input_contract
  const entryNode = nodes.find((n) => n.id === entryNodeId);
  let inputContract: unknown = null;
  let uiSchema: unknown = null;

  if (entryNode) {
    const entryMao = await resolveCurrentMao(db, entryNode.casepack_key);
    if (entryMao) {
      inputContract = entryMao["input_contract"] ?? null;
      uiSchema = entryMao["ui_schema"] ?? null;
    }
  }

  // Resolve final node(s) CasePack for output_contract
  let outputContract: { fields: any[]; required_fields: string[]; public_fields: string[] } | null = null;
  for (const finalNodeId of finalNodeIds) {
    const finalNode = nodes.find((n) => n.id === finalNodeId);
    if (finalNode) {
      const finalMao = await resolveCurrentMao(db, finalNode.casepack_key);
      if (finalMao && finalMao["output_contract"]) {
        if (!outputContract) {
          outputContract = { fields: [], required_fields: [], public_fields: [] };
        }
        const oc = finalMao["output_contract"] as any;
        outputContract.fields.push(...(oc.fields || []));
        outputContract.required_fields.push(...(oc.required_fields || []));
        if (oc.public_fields) {
          outputContract.public_fields.push(...oc.public_fields);
        }
      }
    }
  }

  // Build sanitized node list (id + label only)
  const graphNodes = nodes.map((n) => ({
    id: n.id,
    label: n.label ?? n.id,
  }));

  return apiSuccess(deepSanitize({
    slug:            app.slug,
    title:           app.title,
    description:     app.description,
    type:            app.type,
    pack_key:        app.pack_key,
    input_contract:  inputContract,
    output_contract: outputContract,
    ui_schema:       uiSchema,
    graph_nodes:     graphNodes,
    entry_node:      entryNodeId,
    final_nodes:     finalNodeIds,
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveCurrentMao(db: any, casepackKey: string): Promise<Record<string, unknown> | null> {
  const { data: cp } = await db
    .from("casepacks")
    .select("id")
    .eq("key", casepackKey)
    .maybeSingle();

  if (!cp) return null;

  const { data: version } = await db
    .from("casepack_versions")
    .select("casepack_json")
    .eq("casepack_id", cp.id)
    .eq("is_current", true)
    .maybeSingle();

  if (!version?.casepack_json) return null;
  return version.casepack_json as Record<string, unknown>;
}
