/**
 * GET /api/packs/:id — fetch Domain Pack metadata (safe columns only).
 */

import { NextResponse } from "next/server";
import { apiSuccess, handleRouteError } from "../../../../lib/api/response";
import { createDomainPackService } from "../../../../lib/api/domain-pack-factory";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const svc  = createDomainPackService();
    const pack = await svc.getById(id);
    return apiSuccess(pack);
  } catch (err) {
    return handleRouteError(err);
  }
}
