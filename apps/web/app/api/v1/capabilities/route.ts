import { PLATFORM_SUPPORTED_TOOLS } from "@cognitive-forge/casepack";
import { extractV1Auth, toV1ErrorResponse } from "@/lib/api/v1-runtime";

export async function GET(req: Request): Promise<Response> {
  try {
    extractV1Auth(req, { requireBearer: false });
    return Response.json(
      {
        schema_versions: ["2.0", "2.0-draft"],
        features: [
          "taskflow_cx_2_0",
          "human_review_loop",
          "evidence_citation_grounding",
          "fact_conflict_hold",
          "webhook_hmac_sha256",
          "gallery_v2_36_catalog",
          "pilot_packs_12",
          "benchmark_lab_ab_comparison",
          "persona_fork_lineage",
          "project_brief_2stage_matching",
          ...PLATFORM_SUPPORTED_TOOLS,
        ],
      },
      { status: 200 }
    );
  } catch (err) {
    return toV1ErrorResponse(err);
  }
}
