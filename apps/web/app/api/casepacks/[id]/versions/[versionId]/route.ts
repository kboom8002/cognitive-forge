/**
 * GET /api/casepacks/:id/versions/:versionId
 *
 * Returns the full version record including casepack_json.
 * This is a management endpoint — not a public endpoint.
 * The FORBIDDEN column restriction applies to PUBLIC APIs only (doc 07).
 * Workspace admins may access the full JSON for authoring/debugging.
 */

import { NextResponse } from "next/server";
import { apiSuccess, handleRouteError } from "../../../../../../lib/api/response";
import { createCasePackService } from "../../../../../../lib/api/casepack-factory";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
): Promise<NextResponse> {
  try {
    const { versionId } = await params;
    const svc     = createCasePackService();
    const version = await svc.getVersion(versionId);
    return apiSuccess(version);
  } catch (err) {
    return handleRouteError(err);
  }
}
