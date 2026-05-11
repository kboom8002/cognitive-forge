/**
 * POST /api/casepacks/:id/versions
 *
 * Creates a new version row for a CasePack.
 * Validates the full casepack_json against CasePackMAOSchema before storage.
 * Optionally promotes the version to is_current.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSuccess, handleRouteError } from "../../../../../lib/api/response";
import { validateBody } from "../../../../../lib/api/validate";
import { createCasePackService } from "../../../../../lib/api/casepack-factory";

const CreateVersionBodySchema = z.object({
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, { message: "version must be semver (e.g. 1.0.0)" }),
  /** Full CasePack-MAO JSON — validated against CasePackMAOSchema by service. */
  casepack_json: z.record(z.string(), z.unknown()),
  manifest_json: z.record(z.string(), z.unknown()).optional(),
  /** If true, promote this version to is_current after creation. */
  set_current: z.boolean().default(false),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body   = await validateBody(req, CreateVersionBodySchema);
    const svc    = createCasePackService();

    const version = await svc.createVersion(id, {
      version:       body.version,
      casepack_json: body.casepack_json,
      manifest_json: body.manifest_json,
      set_current:   body.set_current ?? false,
    });

    // Strip casepack_json from response — it is a FORBIDDEN public key.
    // Callers who need the full JSON must fetch via GET /versions/:versionId
    // with a service-role token.
    const { casepack_json: _forbidden, manifest_json: _forbidden2, ...safe } =
      (version as unknown) as Record<string, unknown>;

    return apiSuccess(safe, undefined, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
