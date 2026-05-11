/**
 * GET  /api/casepacks   — list casepacks for a workspace
 * POST /api/casepacks   — create a new casepack parent row
 *
 * Query params for GET: workspaceId (required), status?, visibility?
 * Body for POST: { workspace_id, key, status?, visibility? }
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSuccess, handleRouteError } from "../../../lib/api/response";
import { validateBody, requireQuery } from "../../../lib/api/validate";
import { createCasePackService } from "../../../lib/api/casepack-factory";

// ── Input schemas ─────────────────────────────────────────────────────────────

const CreateCasePackBodySchema = z.object({
  workspace_id: z.string().uuid().optional().nullable(),
  key: z
    .string()
    .regex(/^casepack\.[a-z0-9_]+\.v[0-9]+$/, {
      message: "key must match pattern: casepack.<name>.v<version>",
    }),
  status: z.enum(["draft", "published"]).optional(),
  visibility: z.enum(["public", "workspace", "private"]).optional(),
});

// ── Handlers ──────────────────────────────────────────────────────────────────

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const url         = new URL(req.url);
    const workspaceId = requireQuery(url, "workspaceId");
    const status      = url.searchParams.get("status") as "draft" | "published" | null;
    const visibility  = url.searchParams.get("visibility") as "public" | "workspace" | "private" | null;

    const svc  = createCasePackService();
    const packs = await svc.list({
      workspace_id: workspaceId,
      ...(status     ? { status }     : {}),
      ...(visibility ? { visibility } : {}),
    });

    return apiSuccess(packs, { count: packs.length });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = await validateBody(req, CreateCasePackBodySchema);
    const svc  = createCasePackService();
    const pack = await svc.create({
      key:          body.key,
      workspace_id: body.workspace_id ?? null,
      ...(body.status     ? { status: body.status }         : {}),
      ...(body.visibility ? { visibility: body.visibility } : {}),
    });
    return apiSuccess(pack, undefined, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
