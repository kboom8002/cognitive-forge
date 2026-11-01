import { getV1Context, toV1ErrorResponse } from "@/lib/api/v1-runtime";

export async function GET(req: Request): Promise<Response> {
  try {
    const sp = new URL(req.url).searchParams;
    const cursor = sp.get("cursor") ?? undefined;
    const limitParam = sp.get("limit");
    const limit = limitParam !== null ? Number(limitParam) : undefined;
    const category = sp.get("category") ?? undefined;
    const language = sp.get("language") ?? undefined;
    const availability = sp.get("availability") ?? undefined;
    const offering_mode = sp.get("offering_mode") ?? undefined;

    const { galleryService } = getV1Context();
    const result = galleryService.listPublicListings({
      cursor,
      limit,
      category,
      language,
      availability,
      offering_mode,
    });

    return Response.json(result, { status: 200 });
  } catch (err) {
    return toV1ErrorResponse(err);
  }
}
