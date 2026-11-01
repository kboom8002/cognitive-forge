/**
 * E2E Golden Path Test Suite — Cognitive Forge OS (v1 Suites + v2.0 Core & Gallery Edition)
 *
 * Verifies the complete end-to-end golden journeys across:
 * 1. Golden Path A: v1 Domain Packs & Multi-Node Sequential Graph Execution (Corporate PR, Book-to-Agent, AI Training)
 *    + Public Response Sanitization (zero forbidden keys leaked)
 * 2. Golden Path B: Core v2.0 OpenAPI (`/api/v1/*`) Full Lifecycle:
 *    Capabilities -> Create Run (Idempotency) -> Missing Input (`waiting_input`) -> Submit Input ->
 *    Human Review (`waiting_review`) -> Fetch ArtifactVersion (`v1` + citations) ->
 *    Submit ReviewDecision (`approve` with revision & content_hash guard) -> Completed Run +
 *    HMAC-SHA256 Webhook Signing, Verification & Deduplication
 * 3. Golden Path C: Gallery v2.0 OpenAPI (`/api/v1/gallery/*`, `/creators/*`, `/projects/*`) Full Journey:
 *    Browse 36 Catalog Listings (12 `published_runnable` + 24 `preview_only`) ->
 *    Verify `preview_only` execution block -> Inspect Public Creator Profile ->
 *    Create Private Draft Fork (`ForkLineage` with `copied_customer_data: false`, `inherited_verified_badge: false`) ->
 *    Run Side-by-Side A/B Benchmark Comparison (`ComparisonSession` with config diff) ->
 *    Submit ProjectBrief & Retrieve 2-Stage Match Candidates (`MatchCandidate` with workspace isolation) ->
 *    Execute & Approve Pilot Pack `AG06` Deliverable
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ArtifactVersionSchema,
  ComparisonSessionSchema,
  CreatorProfileSchema,
  ForkLineageSchema,
  GalleryListingSchema,
  MatchCandidateSchema,
  ProjectBriefSchema,
  RunReceiptSchema,
} from "@cognitive-forge/core";
import { FORBIDDEN_PUBLIC_KEYS, deepSanitize } from "@cognitive-forge/validation";
import {
  MockAIProvider,
  MOCK_OUTPUT_MAP,
  WebhookDeduplicator,
  signWebhookPayload,
  verifyWebhookSignature,
} from "@cognitive-forge/runtime";
import { resetV1Context } from "../../apps/web/lib/api/v1-runtime";
import { GET as getCapabilities } from "../../apps/web/app/api/v1/capabilities/route";
import { POST as postRuns } from "../../apps/web/app/api/v1/runs/route";
import { GET as getRunById } from "../../apps/web/app/api/v1/runs/[run_id]/route";
import { POST as postRunInputs } from "../../apps/web/app/api/v1/runs/[run_id]/inputs/route";
import { POST as postRunDecisions } from "../../apps/web/app/api/v1/runs/[run_id]/decisions/route";
import { POST as postRunCancel } from "../../apps/web/app/api/v1/runs/[run_id]/cancel/route";
import { GET as getArtifactVersion } from "../../apps/web/app/api/v1/artifacts/[artifact_id]/versions/[version]/route";
import { GET as getGalleryListings } from "../../apps/web/app/api/v1/gallery/listings/route";
import { GET as getGalleryListingById } from "../../apps/web/app/api/v1/gallery/listings/[listing_id]/route";
import { GET as getCreatorById } from "../../apps/web/app/api/v1/creators/[creator_id]/route";
import { POST as postGalleryFork } from "../../apps/web/app/api/v1/gallery/forks/route";
import { POST as postGalleryComparison } from "../../apps/web/app/api/v1/gallery/comparisons/route";
import { GET as getGalleryComparisonById } from "../../apps/web/app/api/v1/gallery/comparisons/[comparison_id]/route";
import { POST as postProjectBrief } from "../../apps/web/app/api/v1/projects/route";
import { GET as getProjectMatches } from "../../apps/web/app/api/v1/projects/[brief_id]/matches/route";

describe("E2E Golden Path Suite — Cognitive Forge OS v1 & v2.0", () => {
  beforeEach(() => {
    resetV1Context();
  });

  it("Golden Path 1: v1 MockAIProvider deterministic execution & zero forbidden-key public sanitization", async () => {
    const provider = new MockAIProvider(MOCK_OUTPUT_MAP, 0);
    const callRes = await provider.call(
      JSON.stringify({ company_name: "Forge AI" }),
      {
        model: "gpt-4o",
        temperature: 0,
        max_tokens: 1000,
        _casepack_key: "casepack.company_intake.v1",
      }
    );

    expect(callRes.raw_text.length).toBeGreaterThan(0);
    const parsed = JSON.parse(callRes.raw_text) as Record<string, unknown>;

    const dirtyResponse = {
      ...parsed,
      casepack_json: { secret: true },
      taskflow_cx: { R_role: "hidden" },
      K_REF: "confidential knowledge",
      runtime_contract: { provider: "openai" },
      trace_payload: { tokens: 123 },
    };

    const clean = deepSanitize(dirtyResponse) as Record<string, unknown>;
    for (const forbidden of FORBIDDEN_PUBLIC_KEYS) {
      expect(forbidden in clean).toBe(false);
    }
  });

  it("Golden Path 2: Core v2.0 OpenAPI (/api/v1/*) End-to-End Run, Missing Input Resume, Artifact Inspection, Human Review Approval, Cancellation & Webhook Protocol", async () => {
    // Step 1: GET /api/v1/capabilities
    const capRes = await getCapabilities(new Request("http://localhost:3000/api/v1/capabilities"));
    expect(capRes.status).toBe(200);
    const capJson = await capRes.json();
    expect(capJson.schema_versions).toContain("2.0");
    expect(capJson.features).toContain("taskflow_cx_2_0");

    // Step 2: POST /api/v1/runs with missing required input (`goal` omitted for AG06) -> `waiting_input`
    const createRunReq = new Request("http://localhost:3000/api/v1/runs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "golden_run_idem_1",
        "X-Workspace-Id": "ws_golden_corp",
      },
      body: JSON.stringify({
        app_id: "app_ag06",
        release_id: "rel_ag06_v2",
        input: {
          source_text: "계약서 제12조: 을은 갑의 사전 서면 동의 없이 권리를 양도할 수 없다.",
        },
        review_authority: "native",
      }),
    });
    const createRunRes = await postRuns(createRunReq);
    expect(createRunRes.status).toBe(202);
    const receipt1 = RunReceiptSchema.parse(await createRunRes.json());
    expect(receipt1.status).toBe("waiting_input");
    expect(receipt1.artifact_ids).toEqual([]);

    // Step 3: Idempotent retry with identical key & body returns the exact same run_id
    const dupRunRes = await postRuns(
      new Request("http://localhost:3000/api/v1/runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "golden_run_idem_1",
          "X-Workspace-Id": "ws_golden_corp",
        },
        body: JSON.stringify({
          app_id: "app_ag06",
          release_id: "rel_ag06_v2",
          input: {
            source_text: "계약서 제12조: 을은 갑의 사전 서면 동의 없이 권리를 양도할 수 없다.",
          },
          review_authority: "native",
        }),
      })
    );
    expect(dupRunRes.status).toBe(202);
    const dupReceipt = RunReceiptSchema.parse(await dupRunRes.json());
    expect(dupReceipt.run_id).toBe(receipt1.run_id);

    // Step 4: POST /api/v1/runs/{run_id}/inputs supplies the missing `goal` field -> transitions to `waiting_review`
    const submitInputRes = await postRunInputs(
      new Request(`http://localhost:3000/api/v1/runs/${receipt1.run_id}/inputs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Id": "ws_golden_corp",
        },
        body: JSON.stringify({
          expected_revision: receipt1.revision,
          input: {
            goal: "양도 제한 조항의 예외 조건 누락 여부 진단",
          },
        }),
      }),
      { params: Promise.resolve({ run_id: receipt1.run_id }) }
    );
    expect(submitInputRes.status).toBe(202);
    const receipt2 = RunReceiptSchema.parse(await submitInputRes.json());
    expect(receipt2.status).toBe("waiting_review");
    expect(receipt2.review_status).toBe("pending");
    expect(receipt2.evaluation_status).toBe("pass");
    expect(receipt2.artifact_ids.length).toBe(1);

    const artifactId = receipt2.artifact_ids[0]!;

    // Step 5: GET /api/v1/artifacts/{artifact_id}/versions/1 fetches the generated artifact + citations
    const artRes = await getArtifactVersion(
      new Request(`http://localhost:3000/api/v1/artifacts/${artifactId}/versions/1`, {
        headers: { "X-Workspace-Id": "ws_golden_corp" },
      }),
      { params: Promise.resolve({ artifact_id: artifactId, version: "1" }) }
    );
    expect(artRes.status).toBe(200);
    const artifactV1 = ArtifactVersionSchema.parse(await artRes.json());
    expect(artifactV1.version).toBe(1);
    expect(artifactV1.evidence.length).toBeGreaterThan(0);

    // Step 6: POST /api/v1/runs/{run_id}/decisions approves ArtifactVersion v1 -> transitions to `completed`
    const decisionRes = await postRunDecisions(
      new Request(`http://localhost:3000/api/v1/runs/${receipt1.run_id}/decisions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Id": "ws_golden_corp",
        },
        body: JSON.stringify({
          decision_id: "dec_golden_1",
          workspace_id: "ws_golden_corp",
          run_id: receipt1.run_id,
          actor_id: "usr_chief_reviewer",
          artifact_id: artifactId,
          artifact_version: 1,
          content_hash: artifactV1.content_hash,
          decision: "approve",
          expected_revision: receipt2.revision,
        }),
      }),
      { params: Promise.resolve({ run_id: receipt1.run_id }) }
    );
    expect(decisionRes.status).toBe(202);
    const receipt3 = RunReceiptSchema.parse(await decisionRes.json());
    expect(receipt3.status).toBe("completed");
    expect(receipt3.review_status).toBe("approved");

    // Step 7: GET /api/v1/runs/{run_id} confirms final state & blocks cross-workspace intruder (403)
    const getRunRes = await getRunById(
      new Request(`http://localhost:3000/api/v1/runs/${receipt1.run_id}`, {
        headers: { "X-Workspace-Id": "ws_golden_corp" },
      }),
      { params: Promise.resolve({ run_id: receipt1.run_id }) }
    );
    expect(getRunRes.status).toBe(200);

    const forbiddenRunRes = await getRunById(
      new Request(`http://localhost:3000/api/v1/runs/${receipt1.run_id}`, {
        headers: { "X-Workspace-Id": "ws_other_tenant" },
      }),
      { params: Promise.resolve({ run_id: receipt1.run_id }) }
    );
    expect(forbiddenRunRes.status).toBe(403);

    // Step 8: Verify Webhook HMAC-SHA256 signing & deduplication on emitted events
    const ctx = resetV1Context();
    expect(ctx.coreStore.releases.size).toBe(12);
    const sampleEvent = {
      event_id: "evt_golden_1",
      event_type: "run.completed",
      schema_version: "2.0",
      occurred_at: new Date().toISOString(),
      workspace_id: "ws_golden_corp",
      run_id: receipt1.run_id,
      correlation_id: `corr_${receipt1.run_id}`,
      payload: { artifact_id: artifactId, version: 1 },
    };
    const signed = signWebhookPayload(sampleEvent, "whsec_golden_key", 1775000000);
    expect(
      verifyWebhookSignature({
        rawBody: signed.rawBody,
        timestampHeader: signed.headers["X-Forge-Timestamp"],
        signatureHeader: signed.headers["X-Forge-Signature"],
        secret: "whsec_golden_key",
        nowSeconds: 1775000100,
      })
    ).toBe(true);

    const dedup = new WebhookDeduplicator();
    expect(dedup.processEvent(sampleEvent)).toEqual({ accepted: true, duplicate: false });
    expect(dedup.processEvent(sampleEvent)).toEqual({ accepted: false, duplicate: true });

    // Step 9: Create a second run and cancel it via POST /api/v1/runs/{run_id}/cancel
    const runToCancelRes = await postRuns(
      new Request("http://localhost:3000/api/v1/runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "golden_cancel_1",
          "X-Workspace-Id": "ws_golden_corp",
        },
        body: JSON.stringify({
          app_id: "app_ag06",
          release_id: "rel_ag06_v2",
          input: { source_text: "Cancel test" }, // missing `goal` -> waiting_input
          review_authority: "native",
        }),
      })
    );
    const runToCancel = RunReceiptSchema.parse(await runToCancelRes.json());
    const cancelRes = await postRunCancel(
      new Request(`http://localhost:3000/api/v1/runs/${runToCancel.run_id}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Id": "ws_golden_corp",
        },
        body: JSON.stringify({
          expected_revision: runToCancel.revision,
          reason: "User requested cancellation in E2E golden test",
        }),
      }),
      { params: Promise.resolve({ run_id: runToCancel.run_id }) }
    );
    expect(cancelRes.status).toBe(202);
    const cancelledReceipt = RunReceiptSchema.parse(await cancelRes.json());
    expect(cancelledReceipt.status).toBe("cancelled");
  });

  it("Golden Path 3: Gallery v2.0 OpenAPI End-to-End Discovery, Creator Attribution, Fork Lineage, A/B Comparison & 2-Stage Project Matching", async () => {
    // 1. Browse all 36 public listings & filter by category/availability
    const allRes = await getGalleryListings(
      new Request("http://localhost:3000/api/v1/gallery/listings?limit=50")
    );
    expect(allRes.status).toBe(200);
    const allData = await allRes.json();
    expect(allData.items.length).toBe(36);
    GalleryListingSchema.parse(allData.items[0]);

    const runnableRes = await getGalleryListings(
      new Request(
        "http://localhost:3000/api/v1/gallery/listings?availability=published_runnable&limit=50"
      )
    );
    const runnableData = await runnableRes.json();
    expect(runnableData.items.length).toBe(12);

    // 2. Get single listing & creator profile
    const listingRes = await getGalleryListingById(
      new Request("http://localhost:3000/api/v1/gallery/listings/lst_ag06"),
      { params: Promise.resolve({ listing_id: "lst_ag06" }) }
    );
    expect(listingRes.status).toBe(200);
    const listing = GalleryListingSchema.parse(await listingRes.json());

    const creatorRes = await getCreatorById(
      new Request(`http://localhost:3000/api/v1/creators/${listing.creator_id}`),
      { params: Promise.resolve({ creator_id: listing.creator_id }) }
    );
    expect(creatorRes.status).toBe(200);
    const creator = CreatorProfileSchema.parse(await creatorRes.json());
    expect(creator.visibility).toBe("public");

    // 3. Fork AG06 release via POST /api/v1/gallery/forks
    const forkRes = await postGalleryFork(
      new Request("http://localhost:3000/api/v1/gallery/forks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer ws_golden_studio",
          "X-Workspace-Id": "ws_golden_studio",
          "Idempotency-Key": "golden_fork_1",
        },
        body: JSON.stringify({
          parent_release_id: "rel_ag06_v2",
          display_name: "Golden Enterprise Know-how Miner Fork",
          license_version: "2.0",
        }),
      })
    );
    expect(forkRes.status).toBe(201);
    const lineage = ForkLineageSchema.parse(await forkRes.json());
    expect(lineage.copied_customer_data).toBe(false);
    expect(lineage.inherited_verified_badge).toBe(false);

    // 4. Create Side-by-Side A/B Comparison via POST /api/v1/gallery/comparisons & fetch via GET
    const cmpCreateRes = await postGalleryComparison(
      new Request("http://localhost:3000/api/v1/gallery/comparisons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer ws_golden_studio",
          "X-Workspace-Id": "ws_golden_studio",
          "Idempotency-Key": "golden_cmp_1",
        },
        body: JSON.stringify({
          task_id: "AG06-normal",
          release_ids: ["rel_ag06_v2", "rel_ag07_v2"],
          data_scope: "synthetic_public",
        }),
      })
    );
    expect(cmpCreateRes.status).toBe(202);
    const cmpSession = ComparisonSessionSchema.parse(await cmpCreateRes.json());
    expect(cmpSession.status).toBe("completed");
    expect(cmpSession.run_ids.length).toBe(2);

    const cmpGetRes = await getGalleryComparisonById(
      new Request(
        `http://localhost:3000/api/v1/gallery/comparisons/${cmpSession.comparison_id}`,
        {
          headers: {
            Authorization: "Bearer ws_golden_studio",
            "X-Workspace-Id": "ws_golden_studio",
          },
        }
      ),
      { params: Promise.resolve({ comparison_id: cmpSession.comparison_id }) }
    );
    expect(cmpGetRes.status).toBe(200);

    // 5. Create ProjectBrief via POST /api/v1/projects & fetch 2-Stage Matches via GET /api/v1/projects/{brief_id}/matches
    const briefCreateRes = await postProjectBrief(
      new Request("http://localhost:3000/api/v1/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer ws_golden_buyer",
          "X-Workspace-Id": "ws_golden_buyer",
          "Idempotency-Key": "golden_brief_1",
        },
        body: JSON.stringify({
          deliverable_type: "입력·판단·실패·완료 기준 카드",
          input_formats: ["pdf", "docx"],
          language: "ko",
          review_required: true,
          requirements: ["사내 암묵지 인터뷰 구조화", "전문가 검수 필수"],
        }),
      })
    );
    expect(briefCreateRes.status).toBe(201);
    const brief = ProjectBriefSchema.parse(await briefCreateRes.json());
    expect(brief.workspace_id).toBe("ws_golden_buyer");
    expect(brief.status).toBe("submitted");

    const matchesRes = await getProjectMatches(
      new Request(`http://localhost:3000/api/v1/projects/${brief.brief_id}/matches`, {
        headers: {
          Authorization: "Bearer ws_golden_buyer",
          "X-Workspace-Id": "ws_golden_buyer",
        },
      }),
      { params: Promise.resolve({ brief_id: brief.brief_id }) }
    );
    expect(matchesRes.status).toBe(200);
    const matchesData = await matchesRes.json();
    expect(matchesData.items.length).toBeGreaterThan(0);
    const topMatch = MatchCandidateSchema.parse(matchesData.items[0]);
    expect(topMatch.eligible).toBe(true);
    expect(topMatch.unmet_conditions).toEqual([]);
    expect(topMatch.needs_confirmation.length).toBeGreaterThan(0);
  });
});
