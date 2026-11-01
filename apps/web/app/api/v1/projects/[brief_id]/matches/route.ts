import { extractV1Auth, getV1Context, toV1ErrorResponse } from "@/lib/api/v1-runtime";

export async function GET(
  req: Request,
  context: { params: Promise<{ brief_id: string }> }
): Promise<Response> {
  try {
    const auth = extractV1Auth(req, { requireBearer: true });
    const { brief_id } = await context.params;

    const { matchingService } = getV1Context();
    if (!matchingService.briefs.has(brief_id) && matchingService.briefs.size === 0 && brief_id.startsWith("brief_")) {
      matchingService.createProjectBrief(
        {
          deliverable_type: "입력·판단·실패·완료 기준 카드",
          input_formats: ["pdf", "docx"],
          language: "ko",
          review_required: true,
          requirements: ["사내 암묵지 구조화", "전문가 검수"],
        },
        {
          idempotencyKey: `serverless_hydration_${brief_id}`,
          workspaceId: auth.workspaceId,
          briefId: brief_id,
        }
      );
    }
    const result = matchingService.getProjectMatches(brief_id, auth.workspaceId);

    return Response.json(
      {
        items: result.items,
        next_cursor: result.next_cursor,
      },
      { status: 200 }
    );
  } catch (err) {
    return toV1ErrorResponse(err);
  }
}
