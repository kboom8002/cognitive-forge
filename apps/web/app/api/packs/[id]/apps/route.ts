/**
 * GET /api/packs/:id/apps
 *
 * Returns the list of App assets registered in this Domain Pack.
 * Only returns asset_type = 'app' rows (safe public metadata).
 * Does NOT return the full manifest_json (FORBIDDEN).
 *
 * This powers the App catalogue view for an installed pack.
 */

import { NextResponse } from "next/server";
import { apiSuccess, handleRouteError } from "../../../../../lib/api/response";
import { createDomainPackService } from "../../../../../lib/api/domain-pack-factory";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const svc  = createDomainPackService();
    const apps = await svc.listPackApps(id);
    return apiSuccess(apps, { count: apps.length });
  } catch (err) {
    return handleRouteError(err);
  }
}
