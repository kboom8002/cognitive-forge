import { ProjectCreateSchema } from "@cognitive-forge/core";
import { extractV1Auth, getV1Context, toV1ErrorResponse } from "@/lib/api/v1-runtime";

export async function POST(req: Request): Promise<Response> {
  try {
    const auth = extractV1Auth(req, { requireBearer: true });
    const idempotencyKey =
      req.headers.get("idempotency-key") ?? req.headers.get("Idempotency-Key") ?? "";
    const rawBody = await req.json();
    const body = ProjectCreateSchema.parse(rawBody);

    const { matchingService } = getV1Context();
    const brief = matchingService.createProjectBrief(body, {
      idempotencyKey,
      workspaceId: auth.workspaceId,
    });

    return Response.json(brief, { status: 201 });
  } catch (err) {
    return toV1ErrorResponse(err);
  }
}
