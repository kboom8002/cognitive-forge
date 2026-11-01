import { AppError, AppErrorCode } from "@cognitive-forge/core";
import { extractV1Auth, getV1Context, toV1ErrorResponse } from "@/lib/api/v1-runtime";

export async function GET(
  req: Request,
  context: {
    params: Promise<{ artifact_id: string; version: string }>;
  }
): Promise<Response> {
  try {
    const auth = extractV1Auth(req, { requireBearer: false });
    const { artifact_id, version } = await context.params;
    const versionNum = Number(version);
    if (!Number.isInteger(versionNum) || versionNum < 1) {
      throw new AppError(AppErrorCode.VALIDATION_FAILED, "Artifact version must be a positive integer");
    }

    const actorWs = req.headers.get("x-workspace-id") ? auth.workspaceId : undefined;
    const { runService } = getV1Context();
    const artifact = runService.getArtifactVersion(artifact_id, versionNum, actorWs);
    return Response.json(artifact, { status: 200 });
  } catch (err) {
    return toV1ErrorResponse(err);
  }
}
