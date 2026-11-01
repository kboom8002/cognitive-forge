/**
 * Automated Acceptance Suite for Gallery Edition v2.0 (`GT01` ~ `GT16` + Negative Cases + `/api/v1/*` Routes)
 *
 * Verifies every scenario in `docs/Cognitive_Forge_OS_Gallery_Repo_Docs_v2_0/tests/gallery_acceptance.json`
 * and `docs/Cognitive_Forge_OS_Gallery_Repo_Docs_v2_0/gallery/examples/negative_cases.json`.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  AppErrorCode,
  ComparisonSessionSchema,
  ForkLineageSchema,
  GalleryListingSchema,
  MatchCandidateSchema,
  PersonaProfileSchema,
} from "@cognitive-forge/core";
import { resetV1Context, type V1PlatformContext } from "../../apps/web/lib/api/v1-runtime";
import { GET as getCapabilities } from "../../apps/web/app/api/v1/capabilities/route";
import { POST as postRuns } from "../../apps/web/app/api/v1/runs/route";
import { GET as getListings } from "../../apps/web/app/api/v1/gallery/listings/route";
import { GET as getListingById } from "../../apps/web/app/api/v1/gallery/listings/[listing_id]/route";
import { GET as getCreatorById } from "../../apps/web/app/api/v1/creators/[creator_id]/route";
import { POST as postForks } from "../../apps/web/app/api/v1/gallery/forks/route";
import { POST as postComparisons } from "../../apps/web/app/api/v1/gallery/comparisons/route";
import { POST as postProjects } from "../../apps/web/app/api/v1/projects/route";
import { GET as getProjectMatches } from "../../apps/web/app/api/v1/projects/[brief_id]/matches/route";

describe("Cognitive Forge OS Gallery v2.0 — Acceptance Suite (GT01 ~ GT16)", () => {
  let ctx: V1PlatformContext;

  beforeEach(() => {
    ctx = resetV1Context();
  });

  it("GT01: preview_only listing preserves sample metadata and strictly blocks live execution", async () => {
    // AG03 is one of the 24 preview_only catalog entries
    const listing = ctx.galleryService.getPublicListing("lst_ag03");
    expect(listing.availability).toBe("preview_only");
    expect(listing.release_id).toBeNull();
    expect(listing.sample_origin).toBe("synthetic_fixture");

    // Attempting to execute its preview release via POST /api/v1/runs must fail with 422
    const req = new Request("http://localhost:3000/api/v1/runs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "idem_gt01",
      },
      body: JSON.stringify({
        app_id: "app_ag03",
        release_id: "rel_ag03_preview",
        input: { query: "attempt live run on preview_only" },
        review_authority: "native",
      }),
    });
    const res = await postRuns(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe(AppErrorCode.UNPROCESSABLE_ENTITY);
  });

  it("GT02: Modifying a pack creates a private draft, enforces non-impersonation, and hides private creators (404)", async () => {
    const forkLineage = ctx.forkService.createFork(
      {
        parent_release_id: "rel_ag06_v2",
        display_name: "Modified Contract Diagnostic Draft",
        license_version: "1.0",
      },
      { idempotencyKey: "idem_gt02", ownerWorkspaceId: "ws_creator_a" }
    );
    const childDraft = ctx.forkService.getChildDraftPack(forkLineage.child_pack_id)!;
    expect(childDraft.visibility).toBe("private");
    expect(childDraft.status).toBe("draft");

    // Persona real_person_impersonation: true must be rejected by schema
    expect(
      PersonaProfileSchema.safeParse({
        persona_id: "p_bad",
        role: "Impersonated Celebrity Lawyer",
        audience: "Clients",
        behavior_rules: ["Rule 1"],
        prohibited_claims: ["Claim 1"],
        real_person_impersonation: true,
      }).success
    ).toBe(false);

    // Private creator profile returns 404 on public API
    const req = new Request("http://localhost:3000/api/v1/creators/cr_private_01");
    const res = await getCreatorById(req, {
      params: Promise.resolve({ creator_id: "cr_private_01" }),
    });
    expect(res.status).toBe(404);
  });

  it("GT03: Forking a release with fork_policy='prohibited' is rejected with 403 FORBIDDEN and leaves original untouched", async () => {
    ctx.galleryService.releaseMeta.set("rel_prohibited_01", {
      release_id: "rel_prohibited_01",
      pack_id: "pack_prohibited_01",
      agent_id: "AG01",
      creator_id: "cr_information",
      fork_policy: "prohibited",
      evaluation_status: "pass",
      verified_badge: true,
      execution_paused: false,
      model_name: "gpt-4.1",
      temperature: 0.2,
      prompt_version: "2.0.0",
    });

    const req = new Request("http://localhost:3000/api/v1/gallery/forks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer ws_user_1",
        "Idempotency-Key": "idem_gt03",
      },
      body: JSON.stringify({
        parent_release_id: "rel_prohibited_01",
        display_name: "Unauthorized Fork",
        license_version: "1.0",
      }),
    });

    const res = await postForks(req);
    expect(res.status).toBe(403);
    expect(ctx.forkService.forks.size).toBe(0);
  });

  it("GT04: Forked child pack never inherits parent verified badge or evaluation pass status (inherited_verified_badge=false)", () => {
    const lineage = ctx.forkService.createFork(
      {
        parent_release_id: "rel_ag06_v2",
        display_name: "AG06 Custom Fork",
        license_version: "1.0",
      },
      { idempotencyKey: "idem_gt04", ownerWorkspaceId: "ws_customer_fork" }
    );

    expect(lineage.inherited_verified_badge).toBe(false);
    const childDraft = ctx.forkService.getChildDraftPack(lineage.child_pack_id)!;
    expect(childDraft.verified_badge).toBe(false);
    expect(childDraft.evaluation_status).toBe("not_run");
  });

  it("GT05: Forking a pack isolates customer data, run logs, and secrets (copied_customer_data=false)", () => {
    const lineage = ctx.forkService.createFork(
      {
        parent_release_id: "rel_ag01_v2",
        display_name: "AG01 Isolated Fork",
        license_version: "1.0",
      },
      { idempotencyKey: "idem_gt05", ownerWorkspaceId: "ws_customer_fork" }
    );

    expect(lineage.copied_customer_data).toBe(false);
    const childDraft = ctx.forkService.getChildDraftPack(lineage.child_pack_id)!;
    expect(childDraft.copied_customer_data).toBe(false);
    expect(childDraft.copied_secrets).toBe(false);
    expect(childDraft.copied_run_logs).toBe(false);
  });

  it("GT06: Promoting a listing to published_runnable when evaluation is not_run or fail is blocked by the release gate", () => {
    ctx.galleryService.releaseMeta.set("rel_untested_01", {
      release_id: "rel_untested_01",
      pack_id: "pack_untested_01",
      agent_id: "AG03",
      creator_id: "cr_information",
      fork_policy: "open",
      evaluation_status: "not_run",
      verified_badge: false,
      execution_paused: false,
      model_name: "gpt-4.1",
      temperature: 0.2,
      prompt_version: "2.0.0",
    });

    expect(() =>
      ctx.galleryService.promoteListingToRunnable("lst_ag03", "rel_untested_01")
    ).toThrowError(expect.objectContaining({ code: AppErrorCode.UNPROCESSABLE_ENTITY }));
  });

  it("GT07: Side-by-side comparison exposes model/temperature configuration differences across candidate releases", () => {
    const session = ctx.comparisonService.createComparison(
      {
        task_id: "BM01",
        release_ids: ["rel_ag01_v2", "rel_ag02_v2"],
        data_scope: "synthetic_public",
      },
      {
        idempotencyKey: "idem_gt07",
        workspaceId: "ws_cmp_user",
        customReleaseConfigs: {
          rel_ag01_v2: { model_name: "gpt-4.1", temperature: 0.1 },
          rel_ag02_v2: { model_name: "claude-sonnet-4", temperature: 0.5 },
        },
      }
    );

    const detail = ctx.comparisonService.getComparisonDetail(session.comparison_id, "ws_cmp_user");
    expect(detail.config_diff.is_pure_persona_comparison).toBe(false);
    expect(detail.config_diff.model_differs).toBe(true);
    expect(detail.config_diff.temperature_differs).toBe(true);
    expect(detail.config_diff.diff_warnings.length).toBeGreaterThanOrEqual(2);
  });

  it("GT08: Comparison with owner_private input blocks transmission without explicit recipient consent (403 FORBIDDEN)", async () => {
    const reqDenied = new Request("http://localhost:3000/api/v1/gallery/comparisons", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer ws_private_user",
        "Idempotency-Key": "idem_gt08_denied",
      },
      body: JSON.stringify({
        task_id: "BM01",
        release_ids: ["rel_ag01_v2", "rel_ag02_v2"],
        data_scope: "owner_private",
      }),
    });
    const resDenied = await postComparisons(reqDenied);
    expect(resDenied.status).toBe(403);

    // With explicit X-Recipient-Consent: true, succeeds with 202
    const reqAllowed = new Request("http://localhost:3000/api/v1/gallery/comparisons", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer ws_private_user",
        "Idempotency-Key": "idem_gt08_allowed",
        "X-Recipient-Consent": "true",
      },
      body: JSON.stringify({
        task_id: "BM01",
        release_ids: ["rel_ag01_v2", "rel_ag02_v2"],
        data_scope: "owner_private",
      }),
    });
    const resAllowed = await postComparisons(reqAllowed);
    expect(resAllowed.status).toBe(202);
  });

  it("GT09: Stage 1 hard eligibility filter marks unsupported-language candidates as eligible=false with unmet_conditions", () => {
    const brief = ctx.matchingService.createProjectBrief(
      {
        deliverable_type: "리스크 표",
        input_formats: ["pdf"],
        language: "fr", // French is not in default ko/en offerings
        review_required: true,
        requirements: ["불어 계약서 검토"],
      },
      { idempotencyKey: "idem_gt09", workspaceId: "ws_match_a" }
    );

    const allWithIneligible = ctx.matchingService.getProjectMatches(
      brief.brief_id,
      "ws_match_a",
      { includeIneligible: true }
    );
    expect(allWithIneligible.items.length).toBeGreaterThan(0);
    for (const candidate of allWithIneligible.items) {
      expect(candidate.eligible).toBe(false);
      expect(candidate.unmet_conditions).toEqual(
        expect.arrayContaining([expect.stringContaining("언어 미지원")])
      );
    }
  });

  it("GT10: Stage 2 matching returns non-binding recommendations with needs_confirmation and never auto-executes a contract", () => {
    const brief = ctx.matchingService.createProjectBrief(
      {
        deliverable_type: "리스크",
        input_formats: ["pdf"],
        language: "ko",
        review_required: true,
        requirements: ["계약 독소 조항 분석"],
      },
      { idempotencyKey: "idem_gt10", workspaceId: "ws_match_b" }
    );

    expect(brief.status).toBe("submitted"); // Not "accepted"!
    const matches = ctx.matchingService.getProjectMatches(brief.brief_id, "ws_match_b");
    expect(matches.items.length).toBeGreaterThan(0);
    expect(matches.items[0].eligible).toBe(true);
    expect(matches.items[0].needs_confirmation.length).toBeGreaterThan(0);
  });

  it("GT11: Cross-workspace access to another workspace's ProjectBrief matches is rejected with 403 FORBIDDEN", async () => {
    const createReq = new Request("http://localhost:3000/api/v1/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer ws_owner_B",
        "X-Workspace-Id": "ws_owner_B",
        "Idempotency-Key": "idem_gt11",
      },
      body: JSON.stringify({
        deliverable_type: "요약",
        input_formats: ["pdf"],
        language: "ko",
        review_required: false,
        requirements: ["보안 문서 요약"],
      }),
    });
    const createRes = await postProjects(createReq);
    expect(createRes.status).toBe(201);
    const brief = await createRes.json();

    // Workspace A attempts to read Workspace B's matches -> 403 FORBIDDEN
    const matchReqA = new Request(
      `http://localhost:3000/api/v1/projects/${brief.brief_id}/matches`,
      {
        headers: {
          Authorization: "Bearer ws_intruder_A",
          "X-Workspace-Id": "ws_intruder_A",
        },
      }
    );
    const matchResA = await getProjectMatches(matchReqA, {
      params: Promise.resolve({ brief_id: brief.brief_id }),
    });
    expect(matchResA.status).toBe(403);
  });

  it("GT12: Idempotent fork request with same Idempotency-Key creates exactly one draft and one ForkLineage", () => {
    const first = ctx.forkService.createFork(
      {
        parent_release_id: "rel_ag06_v2",
        display_name: "Idempotent Fork Test",
        license_version: "1.0",
      },
      { idempotencyKey: "idem_gt12_key", ownerWorkspaceId: "ws_gt12" }
    );

    const second = ctx.forkService.createFork(
      {
        parent_release_id: "rel_ag06_v2",
        display_name: "Idempotent Fork Test",
        license_version: "1.0",
      },
      { idempotencyKey: "idem_gt12_key", ownerWorkspaceId: "ws_gt12" }
    );

    expect(second.fork_id).toBe(first.fork_id);
    expect(second.child_pack_id).toBe(first.child_pack_id);
    expect(ctx.forkService.listForksByWorkspace("ws_gt12").length).toBe(1);
  });

  it("GT13: Partial failure in comparison session retries only the failed candidate without re-running or double-billing completed runs", () => {
    const session = ctx.comparisonService.createComparison(
      {
        task_id: "BM01",
        release_ids: ["rel_ag01_v2", "rel_ag02_v2"],
        data_scope: "synthetic_public",
      },
      {
        idempotencyKey: "idem_gt13",
        workspaceId: "ws_gt13",
        simulateFailedReleaseIds: ["rel_ag02_v2"],
      }
    );

    expect(session.status).toBe("failed");
    const beforeRetry = ctx.comparisonService.getComparisonDetail(
      session.comparison_id,
      "ws_gt13"
    );
    expect(beforeRetry.runs[0].status).toBe("completed");
    expect(beforeRetry.runs[0].billed_units).toBe(1);
    expect(beforeRetry.runs[1].status).toBe("failed");
    expect(beforeRetry.runs[1].billed_units).toBe(0);

    // Retry failed candidate runs
    const recovered = ctx.comparisonService.retryFailedCandidateRuns(session.comparison_id);
    expect(recovered.session.status).toBe("completed");
    expect(recovered.retried_run_ids).toEqual([beforeRetry.runs[1].run_id]);
    // First candidate was NOT re-executed or double-billed
    expect(recovered.runs[0].execution_count).toBe(1);
    expect(recovered.runs[0].billed_units).toBe(1);
    expect(recovered.runs[1].status).toBe("completed");
    expect(recovered.runs[1].billed_units).toBe(1);
  });

  it("GT14: Feedback on release v1 remains pinned to v1 even after release v2 is published", () => {
    ctx.comparisonService.recordReleaseFeedback({
      release_id: "rel_ag06_v1",
      pack_id: "pack_ag06",
      workspace_id: "ws_reviewer",
      score: 4,
      comment: "v1 feedback comment",
    });

    // Publish v2 and record separate feedback
    ctx.comparisonService.recordReleaseFeedback({
      release_id: "rel_ag06_v2",
      pack_id: "pack_ag06",
      workspace_id: "ws_reviewer",
      score: 5,
      comment: "v2 feedback comment",
    });

    const v1Feedback = ctx.comparisonService.getReleaseFeedback("rel_ag06_v1");
    const v2Feedback = ctx.comparisonService.getReleaseFeedback("rel_ag06_v2");
    expect(v1Feedback.length).toBe(1);
    expect(v1Feedback[0].release_id).toBe("rel_ag06_v1");
    expect(v2Feedback.length).toBe(1);
    expect(v2Feedback[0].release_id).toBe("rel_ag06_v2");
  });

  it("GT15: Pausing a public listing blocks new runs while preserving authorized run history", () => {
    // Run once while active
    const activeRun = ctx.runService.createRun(
      {
        app_id: "app_ag06",
        release_id: "rel_ag06_v2",
        input: { contract_text: "Sample contract clause" },
        review_authority: "native",
      },
      { idempotencyKey: "idem_gt15_before", workspaceId: "ws_gt15" }
    );

    // Pause listing and release
    ctx.galleryService.pauseOrArchiveListing("lst_ag06", "pause");
    ctx.coreStore.setReleaseAvailability("rel_ag06_v2", "paused");

    // New runs are blocked
    expect(() =>
      ctx.runService.createRun(
        {
          app_id: "app_ag06",
          release_id: "rel_ag06_v2",
          input: { contract_text: "New run after pause" },
          review_authority: "native",
        },
        { idempotencyKey: "idem_gt15_after", workspaceId: "ws_gt15" }
      )
    ).toThrowError(expect.objectContaining({ code: AppErrorCode.UNPROCESSABLE_ENTITY }));

    // Existing run history remains accessible to authorized workspace
    const preserved = ctx.runService.getRunReceipt(activeRun.run_id, "ws_gt15");
    expect(preserved.run_id).toBe(activeRun.run_id);
  });

  it("GT16: End-to-end standalone Gallery journey (Browse -> Fork -> Qualify -> Publish -> Project Match -> Run & Review) inside Forge", async () => {
    // 1. Capabilities check
    const capRes = await getCapabilities(new Request("http://localhost:3000/api/v1/capabilities"));
    expect(capRes.status).toBe(200);

    // 2. Browse public runnable listings
    const listRes = await getListings(
      new Request("http://localhost:3000/api/v1/gallery/listings?availability=published_runnable")
    );
    expect(listRes.status).toBe(200);
    const listData = await listRes.json();
    expect(listData.items.length).toBe(12);

    // 3. Inspect single listing
    const singleRes = await getListingById(
      new Request("http://localhost:3000/api/v1/gallery/listings/lst_ag06"),
      { params: Promise.resolve({ listing_id: "lst_ag06" }) }
    );
    expect(singleRes.status).toBe(200);

    // 4. Fork AG06
    const forkLineage = ctx.forkService.createFork(
      {
        parent_release_id: "rel_ag06_v2",
        display_name: "Enterprise Legal Fork",
        license_version: "1.0",
      },
      { idempotencyKey: "idem_gt16_fork", ownerWorkspaceId: "ws_enterprise" }
    );
    expect(forkLineage.inherited_verified_badge).toBe(false);

    // 5. Submit project brief & match
    const brief = ctx.matchingService.createProjectBrief(
      {
        deliverable_type: "조항",
        input_formats: ["pdf"],
        language: "ko",
        review_required: true,
        requirements: ["계약 검토"],
      },
      { idempotencyKey: "idem_gt16_brief", workspaceId: "ws_enterprise" }
    );
    const matches = ctx.matchingService.getProjectMatches(brief.brief_id, "ws_enterprise");
    expect(matches.items.length).toBeGreaterThan(0);

    // 6. Execute & Review inside Forge
    const run = ctx.runService.createRun(
      {
        app_id: "app_ag06",
        release_id: "rel_ag06_v2",
        input: {
          source_text: "제5조 손해배상 한도는 제한 없음으로 한다.",
          goal: "독소 조항 및 누락 보호 조항 진단",
        },
        review_authority: "native",
      },
      { idempotencyKey: "idem_gt16_run", workspaceId: "ws_enterprise", requireReview: true }
    );
    expect(run.status).toBe("waiting_review");

    const art = ctx.runService.getArtifactVersion(run.artifact_ids[0], 1, "ws_enterprise");
    const completed = ctx.runService.submitDecision(
      run.run_id,
      {
        decision_id: "dec_gt16",
        workspace_id: "ws_enterprise",
        run_id: run.run_id,
        actor_id: "usr_enterprise_reviewer",
        artifact_id: art.artifact_id,
        artifact_version: 1,
        content_hash: art.content_hash,
        decision: "approve",
        expected_revision: run.revision,
      },
      "ws_enterprise"
    );
    expect(completed.status).toBe("completed");
    expect(completed.review_status).toBe("approved");
  });

  it("Enforces all 4 negative schema invariants from gallery/examples/negative_cases.json", () => {
    // 1. runnable_without_release
    expect(
      GalleryListingSchema.safeParse({
        listing_id: "lst_neg",
        agent_id: "AG01",
        creator_id: "cr_1",
        release_id: null,
        category: "information",
        status: "public",
        availability: "published_runnable",
        sample_origin: "synthetic_fixture",
        offering_ids: ["off_1"],
      }).success
    ).toBe(false);

    // 2. fork_inherits_badge
    expect(
      ForkLineageSchema.safeParse({
        fork_id: "fork_neg",
        parent_release_id: "rel_1",
        child_pack_id: "pack_2",
        owner_workspace_id: "ws_1",
        license_version: "1.0",
        attribution: "attr",
        copied_customer_data: false,
        inherited_verified_badge: true,
      }).success
    ).toBe(false);

    // 3. eligible_with_unmet
    expect(
      MatchCandidateSchema.safeParse({
        brief_id: "b1",
        offering_id: "o1",
        eligible: true,
        reasons: ["ok"],
        unmet_conditions: ["언어 미지원"],
        needs_confirmation: [],
      }).success
    ).toBe(false);

    // 4. duplicate_comparison_releases
    expect(
      ComparisonSessionSchema.safeParse({
        comparison_id: "c1",
        workspace_id: "ws_1",
        task_id: "BM01",
        release_ids: ["r1", "r1"],
        status: "running",
        data_scope: "synthetic_public",
        run_ids: ["run_1", "run_2"],
      }).success
    ).toBe(false);
  });
});
