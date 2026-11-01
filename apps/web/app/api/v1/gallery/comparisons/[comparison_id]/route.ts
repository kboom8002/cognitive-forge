import { extractV1Auth, getV1Context, toV1ErrorResponse } from "@/lib/api/v1-runtime";

export async function GET(
  req: Request,
  context: { params: Promise<{ comparison_id: string }> }
): Promise<Response> {
  try {
    const auth = extractV1Auth(req, { requireBearer: true });
    const { comparison_id } = await context.params;

    const { comparisonService } = getV1Context();
    const session = comparisonService.getComparison(comparison_id, auth.workspaceId);
    return Response.json(session, { status: 200 });
  } catch (err) {
    return toV1ErrorResponse(err);
  }
}
