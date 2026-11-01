import { getV1Context, toV1ErrorResponse } from "@/lib/api/v1-runtime";

export async function GET(
  _req: Request,
  context: { params: Promise<{ listing_id: string }> }
): Promise<Response> {
  try {
    const { listing_id } = await context.params;
    const { galleryService } = getV1Context();
    const listing = galleryService.getPublicListing(listing_id);
    return Response.json(listing, { status: 200 });
  } catch (err) {
    return toV1ErrorResponse(err);
  }
}
