/**
 * GET /api/casepacks/:id — fetch CasePack metadata by id.
 * Does NOT return casepack_json (that is in versions).
 */

import { NextResponse } from "next/server";
import { apiSuccess, handleRouteError } from "../../../../lib/api/response";
import { createCasePackService } from "../../../../lib/api/casepack-factory";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const svc  = createCasePackService();
    const pack = await svc.getById(id);
    return apiSuccess(pack);
  } catch (err) {
    return handleRouteError(err);
  }
}
