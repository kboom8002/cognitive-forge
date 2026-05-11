/**
 * POST /api/public/apps/:slug/run
 *
 * Executes a public CasePack app and returns sanitized AI output.
 *
 * Security rules (doc 06):
 * - App must be public or unlisted.
 * - casepack_version_id is ALWAYS resolved server-side — never accepted from client.
 * - Output is sanitized by PublicOutputSanitizer (public_fields only).
 * - FORBIDDEN fields are NEVER returned: casepack_json, taskflow_cx, K_REF,
 *   runtime_contract, execution_plan, trace_payload, repair_attempts, etc.
 *
 * Flow:
 * 1. Parse and validate request body.
 * 2. Resolve app by slug → verify public/unlisted.
 * 3. Verify app.type === "casepack".
 * 4. Resolve current casepack_version server-side.
 * 5. Parse and validate MAO from casepack_json.
 * 6. Execute via SingleCasePackRunner (publicMode=true).
 * 7. Return sanitized output.
 */

import { NextResponse } from "next/server";
import { apiSuccess, apiError, handleRouteError } from "../../../../../../lib/api/response";
import { createServiceClient } from "../../../../../../lib/supabase/client";
import { createRuntimeComponents } from "../../../../../../lib/api/runtime-factory";
import { runSingleCasePack } from "@cognitive-forge/runtime";
import { CasePackMAOSchema, AppError, AppErrorCode } from "@cognitive-forge/core";
import { deepSanitize } from "@cognitive-forge/validation";

type Params = Promise<{ slug: string }>;

export async function POST(
  req: Request,
  { params }: { params: Params }
): Promise<NextResponse> {
  try {
    const { slug } = await params;

    // ── 1. Parse request body ───────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return apiError("VALIDATION_ERROR", "Request body must be valid JSON", 400);
    }

    const userInput = (body.input ?? {}) as Record<string, unknown>;

    // Guard: never accept version IDs from the client
    if ("casepack_version_id" in body || "version_id" in body) {
      return apiError(
        "VALIDATION_ERROR",
        "casepack_version_id must not be supplied by the client — it is resolved server-side",
        400
      );
    }

    const db = createServiceClient();

    // ── 2. Resolve app by slug ──────────────────────────────────────────────
    const { data: app, error: appErr } = await db
      .from("apps")
      .select("id, slug, title, type, casepack_key, visibility")
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

    // ── 3. Verify app type ──────────────────────────────────────────────────
    if (app.type !== "casepack") {
      return apiError(
        "VALIDATION_ERROR",
        `App "${slug}" is type "${app.type}". Use /graph-run for graph apps.`,
        400
      );
    }
    if (!app.casepack_key) {
      return apiError("VALIDATION_ERROR", `App "${slug}" has no casepack_key configured`, 400);
    }

    // ── 4. Resolve current casepack version server-side ─────────────────────
    // Step 4a: Find parent CasePack row
    const { data: cp, error: cpErr } = await db
      .from("casepacks")
      .select("id")
      .eq("key", app.casepack_key)
      .maybeSingle();

    if (cpErr) {
      throw new AppError(AppErrorCode.INTERNAL_ERROR, `DB error resolving casepack: ${cpErr.message}`);
    }
    if (!cp) {
      return apiError("NOT_FOUND", `CasePack "${app.casepack_key}" not found`, 404);
    }

    // Step 4b: Find current version
    const { data: version, error: versionErr } = await db
      .from("casepack_versions")
      .select("id, casepack_json")
      .eq("casepack_id", cp.id)
      .eq("is_current", true)
      .maybeSingle();

    if (versionErr) {
      throw new AppError(AppErrorCode.INTERNAL_ERROR, `DB error resolving version: ${versionErr.message}`);
    }
    if (!version?.casepack_json) {
      return apiError("NOT_FOUND", `No published version found for app "${slug}"`, 404);
    }

    // ── 5. Parse and validate the MAO ───────────────────────────────────────
    const maoResult = CasePackMAOSchema.safeParse(version.casepack_json);
    if (!maoResult.success) {
      throw new AppError(
        AppErrorCode.INTERNAL_ERROR,
        `CasePack "${app.casepack_key}" version has an invalid schema: ${maoResult.error.message}`
      );
    }
    const mao = maoResult.data;

    // ── 6. Execute via SingleCasePackRunner ─────────────────────────────────
    const runtime = createRuntimeComponents(db);

    const runResult = await runSingleCasePack({
      workspace_id: runtime.workspaceId,
      casepack_key: app.casepack_key as string,
      mao,
      user_input:   userInput,
      adapter:      runtime.adapter,
      traceWriter:  runtime.traceWriter,
      usageWriter:  runtime.usageWriter,
      runStore:     runtime.runStore,
      publicMode:   true,   // sanitize output through PublicOutputSanitizer
    });

    // ── 7. Return sanitized output ──────────────────────────────────────────
    // runResult.output is already sanitized (publicMode=true strips forbidden fields)
    // NEVER include: execution_plan, repair_attempts, trace_payload, run_id (internal)
    return apiSuccess(deepSanitize({
      status:  runResult.status,
      output:  runResult.output,
    }));
  } catch (err) {
    // AppError(VALIDATION_ERROR) from runSingleCasePack = bad input from user
    if (err instanceof AppError && err.code === AppErrorCode.VALIDATION_ERROR) {
      return apiError(err.code, err.message, 400);
    }
    return handleRouteError(err);
  }
}
