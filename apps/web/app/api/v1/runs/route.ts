import { RunCreateSchema } from "@cognitive-forge/core";
import { extractV1Auth, getV1Context, toV1ErrorResponse } from "@/lib/api/v1-runtime";

export async function POST(req: Request): Promise<Response> {
  try {
    const auth = extractV1Auth(req, { requireBearer: false });
    const idempotencyKey =
      req.headers.get("idempotency-key") ?? req.headers.get("Idempotency-Key") ?? "";
    const rawBody = await req.json();
    const parsed = RunCreateSchema.parse(rawBody);

    const { runService } = getV1Context();
    const actorWs = req.headers.get("x-workspace-id") ? auth.workspaceId : undefined;
    const receipt = runService.createRun(parsed, {
      idempotencyKey,
      workspaceId: auth.workspaceId,
      actorWorkspaceId: actorWs,
    });

    return Response.json(receipt, { status: 202 });
  } catch (err) {
    return toV1ErrorResponse(err);
  }
}
