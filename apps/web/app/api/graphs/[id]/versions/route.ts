/**
 * POST /api/graphs/:id/versions
 *
 * Validates graph_json against CasePackGraphSchema (node/edge cross-refs),
 * creates version row, optionally promotes to is_current.
 * graph_json is stripped from the response (FORBIDDEN public key).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSuccess, handleRouteError } from "../../../../../lib/api/response";
import { validateBody } from "../../../../../lib/api/validate";
import { createGraphService } from "../../../../../lib/api/graph-app-factory";

const CreateVersionBodySchema = z.object({
  version:     z.string().regex(/^\d+\.\d+\.\d+$/, { message: "semver required" }),
  graph_json:  z.record(z.string(), z.unknown()),
  set_current: z.boolean().default(false),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body    = await validateBody(req, CreateVersionBodySchema);
    const version = await createGraphService().createVersion(id, {
      version:     body.version,
      graph_json:  body.graph_json,
      set_current: body.set_current ?? false,
    });
    // Strip graph_json — FORBIDDEN public key
    const { graph_json: _forbidden, ...safe } = (version as unknown) as Record<string, unknown>;
    return apiSuccess(safe, undefined, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
