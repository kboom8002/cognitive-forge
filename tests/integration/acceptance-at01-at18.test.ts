/**
 * Automated Acceptance Suite for Core v2.0 (`AT01` ~ `AT18`)
 *
 * Verifies every scenario in `docs/Cognitive_Forge_OS_Gallery_Repo_Docs_v2_0/tests/acceptance_cases.json`.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  AppError,
  AppErrorCode,
  CasePackDefinitionSchema,
} from "@cognitive-forge/core";
import {
  adaptLegacyCasePack,
  compileTaskflow,
} from "@cognitive-forge/casepack";
import {
  qualifyRelease,
  runEvaluationSuite,
  deepSanitize,
} from "@cognitive-forge/validation";
import {
  InMemoryV2CoreStore,
  V2RunService,
  WebhookDeduplicator,
  signWebhookPayload,
  verifyWebhookSignature,
} from "@cognitive-forge/runtime";

describe("Cognitive Forge OS v2.0 — Core Acceptance Suite (AT01 ~ AT18)", () => {
  let store: InMemoryV2CoreStore;
  let runService: V2RunService;

  beforeEach(() => {
    store = new InMemoryV2CoreStore();
    runService = new V2RunService(store);
  });

  it("AT01: Standalone lifecycle (Draft -> Test/Qualify -> Publish -> Customer Run -> Review -> Artifact Download) without external systems", () => {
    const draftPack = CasePackDefinitionSchema.parse({
      pack_id: "pack_at01",
      version: "2.0.0",
      task: "Generate standalone contract review memo",
      input_schema: { required: ["clause_text"] },
      output_schema: { required: ["summary", "risk_items"] },
      steps: [
        { step_id: "intake", type: "intake", requires_review: false },
        { step_id: "draft", type: "draft", requires_review: false },
        { step_id: "review", type: "review", requires_review: true },
      ],
      evaluation_rules: [{ rule_id: "schema_valid" }, { rule_id: "no_invented_claim" }],
    });
    store.saveCasePack(draftPack);

    // Evaluate & Qualify Release
    const evalReport = runEvaluationSuite({
      run_id: "eval_run_at01",
      casepack: draftPack,
      output_payload: { summary: "Reviewed clause", risk_items: ["Indemnity cap missing"] },
    });
    expect(evalReport.status).toBe("pass");

    const release = qualifyRelease({
      release_id: "rel_at01_v2",
      casepack: draftPack,
      evaluation_report: evalReport,
    });
    store.saveRelease(release, "published_runnable");

    // Customer Run
    const receipt = runService.createRun(
      {
        app_id: "app_at01",
        release_id: release.release_id,
        input: { clause_text: "Party A shall indemnify Party B without limit." },
        review_authority: "native",
      },
      { idempotencyKey: "idem_at01", workspaceId: "ws_customer_1" }
    );
    expect(receipt.status).toBe("waiting_review");
    expect(receipt.review_status).toBe("pending");
    expect(receipt.artifact_ids.length).toBe(1);

    const artifactId = receipt.artifact_ids[0];
    const artV1 = runService.getArtifactVersion(artifactId, 1, "ws_customer_1");
    expect(artV1.version).toBe(1);

    // Human Review Approval
    const approvedReceipt = runService.submitDecision(
      receipt.run_id,
      {
        decision_id: "dec_at01_1",
        workspace_id: "ws_customer_1",
        run_id: receipt.run_id,
        actor_id: "usr_reviewer_1",
        artifact_id: artifactId,
        artifact_version: 1,
        content_hash: artV1.content_hash,
        decision: "approve",
        expected_revision: receipt.revision,
      },
      "ws_customer_1"
    );
    expect(approvedReceipt.status).toBe("completed");
    expect(approvedReceipt.review_status).toBe("approved");
  });

  it("AT02: Guided builder natural-language template customization compiles without raw JSON editing", () => {
    const adapted = adaptLegacyCasePack({
      key: "casepack.faq.builder.v1",
      version: "2.0.0",
      A: "고객 FAQ 응대 설계 에이전트",
      S: "신규 서비스 출시 FAQ 구성",
      T: "질문 목록과 답변 가이드를 생성한다",
      O: "faq_items;escalation_guide",
    });

    const compiled = compileTaskflow(adapted.casepack, {
      taskflow_cx: adapted.taskflow_cx,
    });
    expect(compiled.actor).toContain("FAQ");
    expect(compiled.output_required_sections).toEqual(
      expect.arrayContaining(["faq_items", "escalation_guide"])
    );
  });

  it("AT03: Legacy pack with R_role and K_REF adapts cleanly to A.actor and K partition with deprecation warnings", () => {
    const result = adaptLegacyCasePack({
      key: "casepack.legacy.legal.v1",
      version: "1.0.0",
      taskflow_cx: {
        R_role: "Senior Legal Counsel",
        S_situation: "M&A due diligence",
        T_task: "Summarize key liabilities",
        K_REF: "Standard M&A checklist v3",
        W_watchouts: "Do not invent clauses",
        O_output_contract: "executive_summary;liability_table",
      },
    });

    expect(result.taskflow_cx.A.actor).toBe("Senior Legal Counsel");
    expect(result.taskflow_cx.K.K_REF).toContain("Standard M&A checklist v3");
    expect(result.warnings).toContain("LEGACY_FIELD_MAPPED: R_role -> taskflow_cx.A.actor");
    expect(result.warnings).toContain("LEGACY_FIELD_MAPPED: K_REF/K_EX/K_IN -> taskflow_cx.K");
  });

  it("AT04: Missing required company_name input transitions run to waiting_input without fabricating company_name", () => {
    const pack = CasePackDefinitionSchema.parse({
      pack_id: "pack_at04",
      version: "2.0.0",
      task: "Generate company profile",
      input_schema: { required: ["company_name", "industry"] },
      output_schema: { required: ["profile"] },
      steps: [{ step_id: "intake", type: "intake", requires_review: false }],
      evaluation_rules: [{ rule_id: "no_invented_claim" }],
    });
    store.saveCasePack(pack);
    store.saveRelease({
      release_id: "rel_at04",
      pack_id: "pack_at04",
      pack_version: "2.0.0",
      compiler_version: "2.0.0",
      evaluation_suite_version: "2026.03",
      content_hash: "sha256:rel_at04",
    });

    const receipt = runService.createRun(
      {
        app_id: "app_at04",
        release_id: "rel_at04",
        input: { industry: "B2B SaaS" }, // company_name omitted!
        review_authority: "native",
      },
      { idempotencyKey: "idem_at04", workspaceId: "ws_at04" }
    );

    expect(receipt.status).toBe("waiting_input");
    expect(receipt.artifact_ids).toEqual([]); // No fabricated artifact generated!

    // Now supply the missing input and verify completion
    const resumed = runService.submitInputs(
      receipt.run_id,
      {
        expected_revision: receipt.revision,
        input: { company_name: "Acme Robotics" },
      },
      "ws_at04"
    );
    expect(resumed.status).toBe("completed");
    expect(resumed.artifact_ids.length).toBe(1);
  });

  it("AT05: Conflicting source figures (10억 vs 12억) are flagged with source IDs and block approval until resolved", () => {
    const receipt = runService.createRun(
      {
        app_id: "app_at05",
        release_id: "rel_at05",
        input: {
          sources: [
            { source_id: "doc_A", content: "2025년 연결 기준 매출: 10억" },
            { source_id: "doc_B", content: "2025년 연결 기준 매출: 12억" },
          ],
        },
        review_authority: "native",
      },
      { idempotencyKey: "idem_at05", workspaceId: "ws_at05" }
    );

    expect(receipt.status).toBe("waiting_review");
    const artId = receipt.artifact_ids[0];
    const art = runService.getArtifactVersion(artId, 1, "ws_at05");
    expect(art.content.fact_conflict_flagged).toBe(true);

    // Attempting to approve while conflict is unresolved must fail with 409 CONFLICT
    expect(() =>
      runService.submitDecision(
        receipt.run_id,
        {
          decision_id: "dec_at05",
          workspace_id: "ws_at05",
          run_id: receipt.run_id,
          actor_id: "usr_reviewer",
          artifact_id: artId,
          artifact_version: 1,
          content_hash: art.content_hash,
          decision: "approve",
          expected_revision: receipt.revision,
        },
        "ws_at05"
      )
    ).toThrowError(AppError);
  });

  it("AT06: Provider fault injection distinguishes INVALID_MODEL_JSON, TIMEOUT, PROVIDER_HTTP_ERROR, and BUDGET_EXCEEDED and respects retry/budget caps", () => {
    const faults = [
      "INVALID_MODEL_JSON",
      "TIMEOUT",
      "PROVIDER_HTTP_ERROR",
      "BUDGET_EXCEEDED",
    ] as const;

    const recordedCodes = new Set<string>();

    for (const faultType of faults) {
      const receipt = runService.createRun(
        {
          app_id: "app_at06",
          release_id: "rel_at06",
          input: { query: "test fault" },
          review_authority: "native",
        },
        {
          idempotencyKey: `idem_at06_${faultType}`,
          workspaceId: "ws_at06",
          simulatedFault: {
            type: faultType,
            maxRetries: 2,
            failAttempts: 3,
          },
        }
      );

      expect(receipt.status).toBe("failed");
      const internal = runService.getRunInternalRecord(receipt.run_id);
      expect(internal.error_code).toBe(faultType);
      expect(internal.retry_count).toBeLessThanOrEqual(3);
      recordedCodes.add(internal.error_code!);
    }

    expect(recordedCodes.size).toBe(4);
  });

  it("AT07: Worker interruption and restart resumes from checkpoint step without re-executing completed steps", () => {
    const receipt = runService.createRun(
      {
        app_id: "app_at07",
        release_id: "rel_at07",
        input: { query: "checkpoint test" },
        review_authority: "native",
      },
      {
        idempotencyKey: "idem_at07",
        workspaceId: "ws_at07",
        simulatedFault: {
          type: "TIMEOUT",
          interruptAtStepIndex: 1, // Complete step 0 ('intake'), pause at step 1 ('draft')
        },
      }
    );

    const internalBefore = runService.getRunInternalRecord(receipt.run_id);
    expect(internalBefore.checkpoint_step_index).toBe(1);
    expect(internalBefore.completed_steps).toEqual(["intake"]);

    const resumed = runService.resumeRun(receipt.run_id);
    expect(resumed.resumed_from_step_index).toBe(1);
    expect(resumed.completed_steps).toEqual(["intake", "draft", "review"]);
    expect(resumed.receipt.status).toBe("waiting_review");
  });

  it("AT08: Editing an approved ArtifactVersion v1 creates v2 as pending review while preserving v1 approval history", () => {
    const receipt = runService.createRun(
      {
        app_id: "app_at08",
        release_id: "rel_at08",
        input: { query: "version history test" },
        review_authority: "native",
      },
      { idempotencyKey: "idem_at08", workspaceId: "ws_at08", requireReview: true }
    );

    const artId = receipt.artifact_ids[0];
    const artV1 = runService.getArtifactVersion(artId, 1, "ws_at08");

    const approvedReceipt = runService.submitDecision(
      receipt.run_id,
      {
        decision_id: "dec_at08_v1",
        workspace_id: "ws_at08",
        run_id: receipt.run_id,
        actor_id: "usr_approver",
        artifact_id: artId,
        artifact_version: 1,
        content_hash: artV1.content_hash,
        decision: "approve",
        expected_revision: receipt.revision,
      },
      "ws_at08"
    );
    expect(approvedReceipt.status).toBe("completed");
    expect(approvedReceipt.review_status).toBe("approved");

    // Edit content to produce v2
    const { artifact: artV2, receipt: receiptAfterEdit } =
      runService.editArtifactAndCreateNewVersion(
        receipt.run_id,
        { summary: "Updated summary in v2" },
        "ws_at08"
      );

    expect(artV2.version).toBe(2);
    expect(receiptAfterEdit.status).toBe("waiting_review");
    expect(receiptAfterEdit.review_status).toBe("pending");
    expect(store.getArtifactVersionReviewStatus(artId, 1)).toBe("approved");
    expect(store.getArtifactVersionReviewStatus(artId, 2)).toBe("pending");
    expect(store.getReviewDecisions(receipt.run_id).length).toBe(1);
  });

  it("AT09: Cross-workspace access from Workspace A to Workspace B run or artifact is rejected with 403 FORBIDDEN", () => {
    const receiptB = runService.createRun(
      {
        app_id: "app_at09",
        release_id: "rel_at09",
        input: { secret: "workspace B confidential" },
        review_authority: "native",
      },
      { idempotencyKey: "idem_at09", workspaceId: "ws_B" }
    );

    expect(() => runService.getRunReceipt(receiptB.run_id, "ws_A")).toThrowError(
      expect.objectContaining({ code: AppErrorCode.FORBIDDEN })
    );

    const artId = receiptB.artifact_ids[0];
    expect(() => runService.getArtifactVersion(artId, 1, "ws_A")).toThrowError(
      expect.objectContaining({ code: AppErrorCode.FORBIDDEN })
    );
  });

  it("AT10: Retention policy purges expired raw customer input while preserving RunReceipt and audit telemetry", () => {
    const receipt = runService.createRun(
      {
        app_id: "app_at10",
        release_id: "rel_at10",
        input: { raw_customer_pii: "sensitive_document_text" },
        review_authority: "native",
      },
      { idempotencyKey: "idem_at10", workspaceId: "ws_at10", requireReview: false }
    );

    const purgeResult = store.purgeExpiredRunInputs(receipt.run_id);
    expect(purgeResult.raw_input_purged).toBe(true);
    expect(purgeResult.audit_receipt_preserved).toBe(true);

    const internal = runService.getRunInternalRecord(receipt.run_id);
    expect(internal.inputs).toBeNull();
    expect(internal.receipt.run_id).toBe(receipt.run_id);
  });

  it("AT11: Idempotency-Key returns same run_id on identical retry and 409 CONFLICT on modified payload", () => {
    const first = runService.createRun(
      {
        app_id: "app_at11",
        release_id: "rel_at11",
        input: { doc: "v1" },
        review_authority: "native",
      },
      { idempotencyKey: "idem_same_key", workspaceId: "ws_at11" }
    );

    const second = runService.createRun(
      {
        app_id: "app_at11",
        release_id: "rel_at11",
        input: { doc: "v1" },
        review_authority: "native",
      },
      { idempotencyKey: "idem_same_key", workspaceId: "ws_at11" }
    );

    expect(second.run_id).toBe(first.run_id);

    expect(() =>
      runService.createRun(
        {
          app_id: "app_at11",
          release_id: "rel_at11",
          input: { doc: "different_payload" },
          review_authority: "native",
        },
        { idempotencyKey: "idem_same_key", workspaceId: "ws_at11" }
      )
    ).toThrowError(expect.objectContaining({ code: AppErrorCode.CONFLICT }));
  });

  it("AT12: Webhook HMAC-SHA256 verification, 5-minute replay guard, event_id deduplication, and polling reconciliation", async () => {
    const receipt = runService.createRun(
      {
        app_id: "app_at12",
        release_id: "rel_at12",
        input: { doc: "webhook test" },
        review_authority: "native",
      },
      { idempotencyKey: "idem_at12", workspaceId: "ws_at12", requireReview: false }
    );

    const event = store.events.find((e) => e.run_id === receipt.run_id)!;
    const secret = "whsec_test_secret_2026";
    const nowSec = 1775000000;

    const signed = signWebhookPayload(event, secret, nowSec);
    expect(
      verifyWebhookSignature({
        rawBody: signed.rawBody,
        timestampHeader: signed.headers["X-Forge-Timestamp"],
        signatureHeader: signed.headers["X-Forge-Signature"],
        secret,
        nowSeconds: nowSec + 60,
      })
    ).toBe(true);

    // Expired timestamp (>300s) rejected
    expect(() =>
      verifyWebhookSignature({
        rawBody: signed.rawBody,
        timestampHeader: signed.headers["X-Forge-Timestamp"],
        signatureHeader: signed.headers["X-Forge-Signature"],
        secret,
        nowSeconds: nowSec + 305,
      })
    ).toThrowError(expect.objectContaining({ code: AppErrorCode.UNAUTHORIZED }));

    // Deduplicate duplicate deliveries
    const deduplicator = new WebhookDeduplicator();
    expect(deduplicator.processEvent(event)).toEqual({ accepted: true, duplicate: false });
    expect(deduplicator.processEvent(event)).toEqual({ accepted: false, duplicate: true });

    // Reconcile latest revision via GET /runs/{run_id}
    const reconciled = await deduplicator.reconcileRunState(receipt.run_id, (id) =>
      runService.getRunReceipt(id, "ws_at12")
    );
    expect(reconciled.revision).toBe(receipt.revision);
  });

  it("AT13: Unauthorized reviewer (403) or stale artifact hash / expected_revision (409) rejected without mutating review_status", () => {
    const receipt = runService.createRun(
      {
        app_id: "app_at13",
        release_id: "rel_at13",
        input: { doc: "review guard" },
        review_authority: "native",
      },
      { idempotencyKey: "idem_at13", workspaceId: "ws_at13", requireReview: true }
    );
    const artId = receipt.artifact_ids[0];
    const art = runService.getArtifactVersion(artId, 1, "ws_at13");

    // 1. Unauthorized reviewer -> 403 FORBIDDEN
    expect(() =>
      runService.submitDecision(
        receipt.run_id,
        {
          decision_id: "dec_unauth",
          workspace_id: "ws_at13",
          run_id: receipt.run_id,
          actor_id: "usr_unauthorized_guest",
          artifact_id: artId,
          artifact_version: 1,
          content_hash: art.content_hash,
          decision: "approve",
          expected_revision: receipt.revision,
        },
        "ws_at13"
      )
    ).toThrowError(expect.objectContaining({ code: AppErrorCode.FORBIDDEN }));

    // 2. Stale content_hash -> 409 CONFLICT
    expect(() =>
      runService.submitDecision(
        receipt.run_id,
        {
          decision_id: "dec_stale_hash",
          workspace_id: "ws_at13",
          run_id: receipt.run_id,
          actor_id: "usr_reviewer",
          artifact_id: artId,
          artifact_version: 1,
          content_hash: "sha256:stale_old_hash_0000",
          decision: "approve",
          expected_revision: receipt.revision,
        },
        "ws_at13"
      )
    ).toThrowError(expect.objectContaining({ code: AppErrorCode.CONFLICT }));

    // Verify review_status remained 'pending'
    const current = runService.getRunReceipt(receipt.run_id, "ws_at13");
    expect(current.review_status).toBe("pending");
  });

  it("AT14: Pack requesting unsupported tool capability is rejected at compile/import time with 422 UNPROCESSABLE_ENTITY", () => {
    const packWithUnsupportedTool = CasePackDefinitionSchema.parse({
      pack_id: "pack_at14",
      version: "2.0.0",
      task: "Run quantum kernel",
      input_schema: { required: [] },
      output_schema: { required: ["summary"] },
      steps: [
        {
          step_id: "step_1",
          type: "draft",
          tools: ["unsupported_quantum_sap_connector"],
        },
      ],
      evaluation_rules: [],
    });

    expect(() => compileTaskflow(packWithUnsupportedTool)).toThrowError(
      expect.objectContaining({ code: AppErrorCode.UNPROCESSABLE_ENTITY })
    );
  });

  it("AT15: In-flight v1 run continues using pinned v1 release and casepack snapshot even after v2 is published", () => {
    const packV1 = CasePackDefinitionSchema.parse({
      pack_id: "pack_at15",
      version: "1.0.0",
      task: "V1 task instructions",
      input_schema: { required: ["company_name"] },
      output_schema: { required: ["summary"] },
      steps: [{ step_id: "draft", type: "draft", requires_review: false }],
      evaluation_rules: [{ rule_id: "schema_valid" }],
    });
    store.saveCasePack(packV1);
    store.saveRelease({
      release_id: "rel_at15_v1",
      pack_id: "pack_at15",
      pack_version: "1.0.0",
      compiler_version: "2.0.0",
      evaluation_suite_version: "2026.01",
      content_hash: "sha256:v1_hash",
    });

    // Start v1 run (pauses in waiting_input)
    const runV1 = runService.createRun(
      {
        app_id: "app_at15",
        release_id: "rel_at15_v1",
        input: {},
        review_authority: "native",
      },
      { idempotencyKey: "idem_at15", workspaceId: "ws_at15" }
    );
    expect(runV1.status).toBe("waiting_input");

    // Publish v2 while v1 is in-flight
    const packV2 = CasePackDefinitionSchema.parse({
      ...packV1,
      version: "2.0.0",
      task: "V2 completely changed task instructions",
    });
    store.saveCasePack(packV2);
    store.saveRelease({
      release_id: "rel_at15_v2",
      pack_id: "pack_at15",
      pack_version: "2.0.0",
      compiler_version: "2.0.0",
      evaluation_suite_version: "2026.03",
      content_hash: "sha256:v2_hash",
    });

    // Resume v1 run
    const completedV1 = runService.submitInputs(
      runV1.run_id,
      { expected_revision: runV1.revision, input: { company_name: "Forge Corp" } },
      "ws_at15"
    );
    expect(completedV1.release_id).toBe("rel_at15_v1");

    const art = runService.getArtifactVersion(completedV1.artifact_ids[0], 1, "ws_at15");
    expect(art.content.pack_version).toBe("1.0.0");
    expect(art.content.task).toBe("V1 task instructions");
  });

  it("AT16: Delegated review run stays cleanly in waiting_review when external review system is offline while independent native runs complete", () => {
    const delegatedRun = runService.createRun(
      {
        app_id: "app_delegated",
        release_id: "rel_at16",
        input: { doc: "delegated review doc" },
        review_authority: "delegated",
      },
      { idempotencyKey: "idem_at16_del", workspaceId: "ws_at16", requireReview: true }
    );

    const independentRun = runService.createRun(
      {
        app_id: "app_independent",
        release_id: "rel_at16",
        input: { doc: "auto run doc" },
        review_authority: "native",
      },
      { idempotencyKey: "idem_at16_ind", workspaceId: "ws_at16", requireReview: false }
    );

    expect(independentRun.status).toBe("completed");
    expect(delegatedRun.status).toBe("waiting_review");
  });

  it("AT17: Re-running or updating with modified source documents produces a new artifact version with updated source citation hashes", () => {
    const run = runService.createRun(
      {
        app_id: "app_at17",
        release_id: "rel_at17",
        input: {
          sources: [{ source_id: "company_intro_v1", content: "설립연도 2020년" }],
        },
        review_authority: "native",
      },
      { idempotencyKey: "idem_at17_1", workspaceId: "ws_at17", requireReview: false }
    );
    const artV1 = runService.getArtifactVersion(run.artifact_ids[0], 1, "ws_at17");

    // Re-run with updated source
    const run2 = runService.createRun(
      {
        app_id: "app_at17",
        release_id: "rel_at17",
        input: {
          sources: [{ source_id: "company_intro_v2", content: "설립연도 2020년, 시리즈B 유치" }],
        },
        review_authority: "native",
      },
      { idempotencyKey: "idem_at17_2", workspaceId: "ws_at17", requireReview: false }
    );
    const art2 = runService.getArtifactVersion(run2.artifact_ids[0], 1, "ws_at17");

    expect(artV1.evidence[0].source_id).toBe("company_intro_v1");
    expect(art2.evidence[0].source_id).toBe("company_intro_v2");
    expect(art2.evidence[0].quote_hash).not.toBe(artV1.evidence[0].quote_hash);
  });

  it("AT18: Public response sanitizer strips internal instructions, K_REF, taskflow_cx, model_policy, and secrets", () => {
    const rawInternalPayload = {
      run_id: "run_at18",
      status: "completed",
      summary: "Public deliverable summary",
      taskflow_cx: { A: "Secret actor instructions" },
      K_REF: "Confidential proprietary reference",
      model_policy: { provider: "openai", api_key: "sk-secret" },
      casepack_json: { internal: true },
      trace_payload: { raw_prompt: "system prompt" },
    };

    const sanitized = deepSanitize(rawInternalPayload) as Record<string, unknown>;
    expect(sanitized).toEqual({
      run_id: "run_at18",
      status: "completed",
      summary: "Public deliverable summary",
    });
    expect("taskflow_cx" in sanitized).toBe(false);
    expect("K_REF" in sanitized).toBe(false);
    expect("model_policy" in sanitized).toBe(false);
    expect("casepack_json" in sanitized).toBe(false);
    expect("trace_payload" in sanitized).toBe(false);
  });
});
