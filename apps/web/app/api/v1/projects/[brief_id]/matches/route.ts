import { extractV1Auth, getV1Context, toV1ErrorResponse } from "@/lib/api/v1-runtime";

export async function GET(
  req: Request,
  context: { params: Promise<{ brief_id: string }> }
): Promise<Response> {
  try {
    const auth = extractV1Auth(req, { requireBearer: true });
    const { brief_id } = await context.params;

    const { matchingService } = getV1Context();
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
