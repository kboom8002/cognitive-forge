/**
 * GET  /api/graphs   — list graphs (?workspaceId=, ?status=)
 * POST /api/graphs   — create graph parent row
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSuccess, handleRouteError } from "../../../lib/api/response";
import { validateBody } from "../../../lib/api/validate";
import { createGraphService } from "../../../lib/api/graph-app-factory";

const CreateGraphBodySchema = z.object({
  workspace_id: z.string().uuid().optional().nullable(),
  key:          z.string().regex(/^graph\.[a-z0-9_]+\.v[0-9]+$/, {
    message: "key must match: graph.<name>.v<version>",
  }),
  status: z.enum(["draft", "published"]).optional(),
});

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const url = new URL(req.url);
    const svc = createGraphService();
    const graphs = await svc.list({
      ...(url.searchParams.get("workspaceId") ? { workspace_id: url.searchParams.get("workspaceId")! } : {}),
      ...(url.searchParams.get("status")      ? { status: url.searchParams.get("status") as "draft" | "published" } : {}),
    });
    return apiSuccess(graphs, { count: graphs.length });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body  = await validateBody(req, CreateGraphBodySchema);
    const svc   = createGraphService();
    const graph = await svc.create({
      key:          body.key,
      workspace_id: body.workspace_id ?? null,
      ...(body.status ? { status: body.status } : {}),
    });
    return apiSuccess(graph, undefined, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
