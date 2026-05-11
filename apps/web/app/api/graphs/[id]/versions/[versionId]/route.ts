/**
 * GET /api/graphs/:id/versions/:versionId
 * Management endpoint — returns full version including graph_json.
 * Accessible to authorized dashboard users only (not public).
 */

import { NextResponse } from "next/server";
import { apiSuccess, handleRouteError } from "../../../../../../lib/api/response";
import { createGraphService } from "../../../../../../lib/api/graph-app-factory";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
): Promise<NextResponse> {
  try {
    const { versionId } = await params;
    const version = await createGraphService().getVersion(versionId);
    return apiSuccess(version);
  } catch (err) {
    return handleRouteError(err);
  }
}
