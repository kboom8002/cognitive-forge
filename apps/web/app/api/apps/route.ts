/**
 * GET  /api/apps   — list apps (?workspaceId=, ?type=, ?visibility=)
 * POST /api/apps   — create an app (validates AppObjectSchema + XOR rule)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSuccess, handleRouteError } from "../../../lib/api/response";
import { validateBody } from "../../../lib/api/validate";
import { createAppService } from "../../../lib/api/graph-app-factory";

const CreateAppBodySchema = z.object({
  workspace_id: z.string().uuid().optional().nullable(),
  slug:         z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "slug must be kebab-case" }),
  title:        z.string().min(1),
  description:  z.string().optional(),
  type:         z.enum(["casepack", "graph"]),
  /** Required when type = 'casepack'. */
  casepack_key: z.string().optional(),
  /** Required when type = 'graph'. */
  graph_key:    z.string().optional(),
  visibility:   z.enum(["public", "workspace", "private"]).optional(),
  pack_key:     z.string().optional(),
  extra:        z.record(z.string(), z.unknown()).optional(),
});

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const url = new URL(req.url);
    const svc = createAppService();
    const apps = await svc.list({
      ...(url.searchParams.get("workspaceId") ? { workspace_id: url.searchParams.get("workspaceId")! }                : {}),
      ...(url.searchParams.get("type")        ? { type: url.searchParams.get("type") as "casepack" | "graph" }        : {}),
      ...(url.searchParams.get("visibility")  ? { visibility: url.searchParams.get("visibility") as "public" | "workspace" | "private" } : {}),
    });
    return apiSuccess(apps, { count: apps.length });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = await validateBody(req, CreateAppBodySchema);
    const svc  = createAppService();
    const app  = await svc.create({
      workspace_id: body.workspace_id ?? null,
      slug:         body.slug,
      title:        body.title,
      ...(body.description  !== undefined ? { description:  body.description }  : {}),
      ...(body.casepack_key !== undefined ? { casepack_key: body.casepack_key } : {}),
      ...(body.graph_key    !== undefined ? { graph_key:    body.graph_key }    : {}),
      ...(body.visibility   !== undefined ? { visibility:   body.visibility }   : {}),
      ...(body.pack_key     !== undefined ? { pack_key:     body.pack_key }     : {}),
      ...(body.extra        !== undefined ? { extra:        body.extra }        : {}),
      type: body.type,
    });
    return apiSuccess(app, undefined, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
