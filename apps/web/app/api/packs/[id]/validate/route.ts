/**
 * POST /api/packs/:id/validate
 *
 * Validates a manifest JSON body against DomainPackManifestSchema
 * without persisting anything. Returns validation result.
 *
 * Useful for authoring tools and CI pipelines to pre-validate
 * before committing a new pack version.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSuccess, handleRouteError } from "../../../../../lib/api/response";
import { validateBody } from "../../../../../lib/api/validate";
import { createDomainPackService } from "../../../../../lib/api/domain-pack-factory";

const ValidateBodySchema = z.object({
  manifest_json: z.record(z.string(), z.unknown()),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Validate that the pack exists
    const { id } = await params;
    const svc    = createDomainPackService();
    await svc.getById(id); // throws NOT_FOUND if missing

    const body   = await validateBody(req, ValidateBodySchema);
    const result = svc.validateManifest(body.manifest_json);

    // Return 200 regardless — the valid flag tells the caller the result.
    // This mirrors the ValidationReport status pattern from Sprint 01.
    return apiSuccess(result);
  } catch (err) {
    return handleRouteError(err);
  }
}
