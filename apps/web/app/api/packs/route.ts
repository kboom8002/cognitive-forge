/**
 * GET  /api/packs   — list domain packs (optional ?workspaceId= filter)
 * POST /api/packs   — create a new domain pack parent row
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSuccess, handleRouteError } from "../../../lib/api/response";
import { validateBody } from "../../../lib/api/validate";
import { createDomainPackService } from "../../../lib/api/domain-pack-factory";

const CreatePackBodySchema = z.object({
  workspace_id:     z.string().uuid().optional().nullable(),
  key:              z.string().regex(/^pack\.[a-z0-9_]+\.v[0-9]+$/, {
    message: "key must match: pack.<name>.v<version>",
  }),
  primary_app_slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "primary_app_slug must be a valid slug",
  }),
  status:     z.enum(["draft", "published"]).optional(),
  visibility: z.enum(["public", "workspace", "private"]).optional(),
});

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const url         = new URL(req.url);
    const workspaceId = url.searchParams.get("workspaceId");
    const status      = url.searchParams.get("status") as "draft" | "published" | null;
    const visibility  = url.searchParams.get("visibility") as "public" | "workspace" | "private" | null;

    const svc   = createDomainPackService();
    const packs = await svc.list({
      ...(workspaceId ? { workspace_id: workspaceId } : {}),
      ...(status      ? { status }                    : {}),
      ...(visibility  ? { visibility }                : {}),
    });

    return apiSuccess(packs, { count: packs.length });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = await validateBody(req, CreatePackBodySchema);
    const svc  = createDomainPackService();
    const pack = await svc.create({
      key:              body.key,
      primary_app_slug: body.primary_app_slug,
      workspace_id:     body.workspace_id ?? null,
      ...(body.status     ? { status: body.status }         : {}),
      ...(body.visibility ? { visibility: body.visibility } : {}),
    });
    return apiSuccess(pack, undefined, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
