/**
 * GET /api/graphs/:id/versions/:versionId
 * Management endpoint — returns full version including graph_json.
 * Accessible to authorized dashboard users only (not public).
 */

import { NextResponse } from "next/server";
import { AppError, AppErrorCode } from "@cognitive-forge/core";
import { apiSuccess, handleRouteError } from "../../../../../../lib/api/response";
import { createGraphService } from "../../../../../../lib/api/graph-app-factory";
import { requireManagementAuth } from "../../../../../../lib/api/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
): Promise<NextResponse> {
  try {
    await requireManagementAuth(req);
    const { id, versionId } = await params;
    const version = await createGraphService().getVersion(versionId);
    if (version.graph_id !== id) {
      throw new AppError(
        AppErrorCode.NOT_FOUND,
        `Version "${versionId}" does not belong to Graph "${id}"`
      );
    }
    return apiSuccess(version);
  } catch (err) {
    return handleRouteError(err);
  }
}
