/**
 * GET /api/graphs/:id — graph metadata (safe: no graph_json).
 */

import { NextResponse } from "next/server";
import { apiSuccess, handleRouteError } from "../../../../lib/api/response";
import { createGraphService } from "../../../../lib/api/graph-app-factory";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const graph  = await createGraphService().getById(id);
    return apiSuccess(graph);
  } catch (err) {
    return handleRouteError(err);
  }
}
