import { CancelRequestSchema } from "@cognitive-forge/core";
import { extractV1Auth, getV1Context, toV1ErrorResponse } from "@/lib/api/v1-runtime";

export async function POST(
  req: Request,
  context: { params: Promise<{ run_id: string }> }
): Promise<Response> {
  try {
    const auth = extractV1Auth(req, { requireBearer: false });
    const { run_id } = await context.params;
    const rawBody = await req.json();
    const cancelReq = CancelRequestSchema.parse(rawBody);
    const actorWs = req.headers.get("x-workspace-id") ? auth.workspaceId : undefined;

    const { runService } = getV1Context();
    const receipt = runService.cancelRun(run_id, cancelReq, actorWs);
    return Response.json(receipt, { status: 202 });
  } catch (err) {
    return toV1ErrorResponse(err);
  }
}
