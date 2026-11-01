import { extractV1Auth, getV1Context, toV1ErrorResponse } from "@/lib/api/v1-runtime";

export async function GET(
  req: Request,
  context: { params: Promise<{ run_id: string }> }
): Promise<Response> {
  try {
    const auth = extractV1Auth(req, { requireBearer: false });
    const { run_id } = await context.params;
    const actorWs = req.headers.get("x-workspace-id") ? auth.workspaceId : undefined;

    const { runService } = getV1Context();
    const receipt = runService.getRunReceipt(run_id, actorWs);
    return Response.json(receipt, { status: 200 });
  } catch (err) {
    return toV1ErrorResponse(err);
  }
}
