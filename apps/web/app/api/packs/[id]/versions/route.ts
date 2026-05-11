/**
 * POST /api/packs/:id/versions
 *
 * Creates a new version row, validates the manifest against DomainPackManifestSchema,
 * and syncs the domain_pack_assets table from manifest contents.
 * manifest_json is stripped from the response (FORBIDDEN public key).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSuccess, handleRouteError } from "../../../../../lib/api/response";
import { validateBody } from "../../../../../lib/api/validate";
import { createDomainPackService } from "../../../../../lib/api/domain-pack-factory";

const CreateVersionBodySchema = z.object({
  version:       z.string().regex(/^\d+\.\d+\.\d+$/, {
    message: "version must be semver (e.g. 1.0.0)",
  }),
  manifest_json: z.record(z.string(), z.unknown()),
  set_current:   z.boolean().default(false),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body    = await validateBody(req, CreateVersionBodySchema);
    const svc     = createDomainPackService();

    const version = await svc.createVersion(id, {
      version:       body.version,
      manifest_json: body.manifest_json,
      set_current:   body.set_current ?? false,
    });

    // Strip manifest_json — FORBIDDEN public key.
    const { manifest_json: _forbidden, ...safe } =
      (version as unknown) as Record<string, unknown>;

    return apiSuccess(safe, undefined, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
