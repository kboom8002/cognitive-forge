/**
 * GET /api/graphs/:id — graph metadata (safe: no graph_json).
 */

import { NextResponse } from "next/server";
import { apiSuccess, handleRouteError } from "../../../../lib/api/response";
import { createGraphService } from "../../../../lib/api/graph-app-factory";
import { requireManagementAuth } from "../../../../lib/api/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await requireManagementAuth(req);
    const { id } = await params;
    const graph  = await createGraphService().getById(id);
    return apiSuccess(graph);
  } catch (err) {
    return handleRouteError(err);
  }
}
