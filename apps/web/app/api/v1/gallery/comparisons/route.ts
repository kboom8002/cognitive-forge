import { ComparisonCreateSchema } from "@cognitive-forge/core";
import { extractV1Auth, getV1Context, toV1ErrorResponse } from "@/lib/api/v1-runtime";

export async function POST(req: Request): Promise<Response> {
  try {
    const auth = extractV1Auth(req, { requireBearer: true });
    const idempotencyKey =
      req.headers.get("idempotency-key") ?? req.headers.get("Idempotency-Key") ?? "";
    const recipientConsentHeader =
      req.headers.get("x-recipient-consent") ?? req.headers.get("X-Recipient-Consent");
    const recipientConsent = recipientConsentHeader === "true";

    const rawBody = await req.json();
    const body = ComparisonCreateSchema.parse(rawBody);

    const { comparisonService } = getV1Context();
    const session = comparisonService.createComparison(body, {
      idempotencyKey,
      workspaceId: auth.workspaceId,
      recipientConsent,
    });

    return Response.json(session, { status: 202 });
  } catch (err) {
    return toV1ErrorResponse(err);
  }
}
