import { ForkCreateSchema } from "@cognitive-forge/core";
import { extractV1Auth, getV1Context, toV1ErrorResponse } from "@/lib/api/v1-runtime";

export async function POST(req: Request): Promise<Response> {
  try {
    const auth = extractV1Auth(req, { requireBearer: true });
    const idempotencyKey =
      req.headers.get("idempotency-key") ?? req.headers.get("Idempotency-Key") ?? "";
    const rawBody = await req.json();
    const body = ForkCreateSchema.parse(rawBody);

    const { forkService } = getV1Context();
    const lineage = forkService.createFork(body, {
      idempotencyKey,
      ownerWorkspaceId: auth.workspaceId,
    });

    return Response.json(lineage, { status: 201 });
  } catch (err) {
    return toV1ErrorResponse(err);
  }
}
