import { getV1Context, toV1ErrorResponse } from "@/lib/api/v1-runtime";

export async function GET(
  _req: Request,
  context: { params: Promise<{ creator_id: string }> }
): Promise<Response> {
  try {
    const { creator_id } = await context.params;
    const { galleryService } = getV1Context();
    const creator = galleryService.getPublicCreator(creator_id);
    return Response.json(creator, { status: 200 });
  } catch (err) {
    return toV1ErrorResponse(err);
  }
}
