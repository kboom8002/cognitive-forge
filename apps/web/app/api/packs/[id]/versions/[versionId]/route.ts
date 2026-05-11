/**
 * GET /api/packs/:id/versions/:versionId
 *
 * Returns the full version record including manifest_json.
 * Management endpoint — not public. Accessible to authorized dashboard users.
 */

import { NextResponse } from "next/server";
import { apiSuccess, handleRouteError } from "../../../../../../lib/api/response";
import { createDomainPackService } from "../../../../../../lib/api/domain-pack-factory";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
): Promise<NextResponse> {
  try {
    const { versionId } = await params;
    const svc     = createDomainPackService();
    const version = await svc.getVersion(versionId);
    return apiSuccess(version);
  } catch (err) {
    return handleRouteError(err);
  }
}
