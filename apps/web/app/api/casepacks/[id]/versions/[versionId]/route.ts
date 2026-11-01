/**
 * GET /api/casepacks/:id/versions/:versionId
 *
 * Returns the full version record including casepack_json.
 * This is a management endpoint — not a public endpoint.
 * The FORBIDDEN column restriction applies to PUBLIC APIs only (doc 07).
 * Workspace admins may access the full JSON for authoring/debugging.
 */

import { NextResponse } from "next/server";
import { AppError, AppErrorCode } from "@cognitive-forge/core";
import { apiSuccess, handleRouteError } from "../../../../../../lib/api/response";
import { createCasePackService } from "../../../../../../lib/api/casepack-factory";
import { requireManagementAuth } from "../../../../../../lib/api/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
): Promise<NextResponse> {
  try {
    await requireManagementAuth(req);
    const { id, versionId } = await params;
    const svc     = createCasePackService();
    const version = await svc.getVersion(versionId);
    if (version.casepack_id !== id) {
      throw new AppError(
        AppErrorCode.NOT_FOUND,
        `Version "${versionId}" does not belong to CasePack "${id}"`
      );
    }
    return apiSuccess(version);
  } catch (err) {
    return handleRouteError(err);
  }
}
