/**
 * GET /api/casepacks/:id — fetch CasePack metadata by id.
 * Does NOT return casepack_json (that is in versions).
 */

import { NextResponse } from "next/server";
import { apiSuccess, handleRouteError } from "../../../../lib/api/response";
import { createCasePackService } from "../../../../lib/api/casepack-factory";
import { requireManagementAuth } from "../../../../lib/api/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await requireManagementAuth(req);
    const { id } = await params;
    const svc  = createCasePackService();
    const pack = await svc.getById(id);
    return apiSuccess(pack);
  } catch (err) {
    return handleRouteError(err);
  }
}
