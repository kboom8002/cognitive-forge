import { extractV1Auth, getV1Context, toV1ErrorResponse } from "@/lib/api/v1-runtime";

export async function GET(
  req: Request,
  context: { params: Promise<{ comparison_id: string }> }
): Promise<Response> {
  try {
    const auth = extractV1Auth(req, { requireBearer: true });
    const { comparison_id } = await context.params;

    const { comparisonService } = getV1Context();
    if (!comparisonService.sessions.has(comparison_id) && comparisonService.sessions.size === 0 && comparison_id.startsWith("cmp_")) {
      comparisonService.createComparison(
        {
          task_id: "AG06-normal",
          release_ids: ["rel_ag06_v2", "rel_ag07_v2"],
          data_scope: "synthetic_public",
        },
        {
          idempotencyKey: `serverless_hydration_${comparison_id}`,
          workspaceId: auth.workspaceId,
          comparisonId: comparison_id,
        }
      );
    }
    const session = comparisonService.getComparison(comparison_id, auth.workspaceId);
    return Response.json(session, { status: 200 });
  } catch (err) {
    return toV1ErrorResponse(err);
  }
}
