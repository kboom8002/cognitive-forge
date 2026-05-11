/**
 * tests/unit/bridge/bridge-runner.test.ts
 *
 * Unit tests for runBridge (BridgeRunner).
 *
 * Uses P0 fixture bridge structures:
 * - AI Training: practice → rubric (practice_output_to_rubric_evaluation.v1)
 * - AI Training: rubric → feedback (rubric_evaluation_to_learner_feedback.v1)
 * - Corporate PR: intake → positioning (intake_to_positioning.v1)
 *
 * Tests the full bridge pipeline: source validation → mapping → handoff
 * validation → target validation → context checkpoint → handoff event.
 */

import { describe, it, expect, vi } from "vitest";
import { runBridge } from "@cognitive-forge/bridge";
import type { BridgeRunContext, IHandoffEventStore, HandoffEvent } from "@cognitive-forge/bridge";
import type { BridgeCasePack } from "@cognitive-forge/core";

// ── Fixture: Practice → Rubric bridge (AI Training P0) ───────────────────────

const PRACTICE_TO_RUBRIC: BridgeCasePack = {
  key:                 "bridge.practice_output_to_rubric_evaluation.v1",
  version:             "1.0.0",
  status:              "published",
  source_casepack_key: "casepack.prompt_improvement_practice.v1",
  target_casepack_key: "casepack.rubric_evaluation.v1",
  source_pattern: {
    diagnosis:               "string",
    improved_prompt:         "string",
    improvement_explanation: "string",
  },
  target_pattern: {
    improved_prompt: "string",
    diagnosis:       "string",
  },
  mapping_rules: [
    { source_field: "improved_prompt", target_field: "improved_prompt" },
    { source_field: "diagnosis",       target_field: "diagnosis"       },
  ],
  handoff_contract: {
    source_casepack_key: "casepack.prompt_improvement_practice.v1",
    target_casepack_key: "casepack.rubric_evaluation.v1",
    fields: [
      { key: "improved_prompt", type: "text", label: "Improved Prompt"    },
      { key: "diagnosis",       type: "text", label: "Original Diagnosis" },
    ],
    context_preservation: "partial",
  },
  metadata: { title: "Practice Output → Rubric Evaluation Bridge" },
};

// ── Fixture: Rubric → Feedback bridge ────────────────────────────────────────

const RUBRIC_TO_FEEDBACK: BridgeCasePack = {
  key:                 "bridge.rubric_evaluation_to_learner_feedback.v1",
  version:             "1.0.0",
  status:              "published",
  source_casepack_key: "casepack.rubric_evaluation.v1",
  target_casepack_key: "casepack.learner_feedback.v1",
  source_pattern: { rubric_evaluation: "string", quality_checklist: "string" },
  target_pattern: { rubric_evaluation: "string", quality_checklist: "string" },
  mapping_rules: [
    { source_field: "rubric_evaluation", target_field: "rubric_evaluation" },
    { source_field: "quality_checklist", target_field: "quality_checklist" },
  ],
  handoff_contract: {
    source_casepack_key: "casepack.rubric_evaluation.v1",
    target_casepack_key: "casepack.learner_feedback.v1",
    fields: [
      { key: "rubric_evaluation", type: "text", label: "Rubric Evaluation" },
      { key: "quality_checklist", type: "text", label: "Quality Checklist" },
    ],
    context_preservation: "partial",
  },
  metadata: { title: "Rubric Evaluation → Learner Feedback Bridge" },
};

// ── Fixture: Intake → Positioning bridge (Corporate PR P0) ───────────────────

const INTAKE_TO_POSITIONING: BridgeCasePack = {
  key:                 "bridge.intake_to_positioning.v1",
  version:             "1.0.0",
  status:              "published",
  source_casepack_key: "casepack.company_intake.v1",
  target_casepack_key: "casepack.brand_positioning.v1",
  source_pattern: {
    company_overview:    "string",
    target_audience:     "string",
    key_differentiators: "string",
  },
  target_pattern: {
    company_overview:    "string",
    target_audience:     "string",
    key_differentiators: "string",
  },
  mapping_rules: [
    { source_field: "company_overview",    target_field: "company_overview"    },
    { source_field: "target_audience",     target_field: "target_audience"     },
    { source_field: "key_differentiators", target_field: "key_differentiators" },
  ],
  handoff_contract: {
    source_casepack_key: "casepack.company_intake.v1",
    target_casepack_key: "casepack.brand_positioning.v1",
    fields: [
      { key: "company_overview",    type: "text", label: "Company Overview"    },
      { key: "target_audience",     type: "text", label: "Target Audience"     },
      { key: "key_differentiators", type: "text", label: "Key Differentiators" },
    ],
    context_preservation: "partial",
  },
  metadata: { title: "Intake → Brand Positioning Bridge" },
};

// ── Mock source outputs ───────────────────────────────────────────────────────

const PRACTICE_OUTPUT = {
  diagnosis:               "Weak scope, no audience, no format",
  improved_prompt:         "You are a science writer... (improved)",
  improvement_explanation: "Added role, audience, format",
};

const RUBRIC_OUTPUT = {
  rubric_evaluation: "5/5 clarity, 5/5 audience, 4/5 constraints",
  quality_checklist: "☑ Role ☑ Audience ☑ Task ☑ Format ☐ Constraints",
};

const INTAKE_OUTPUT = {
  company_overview:    "Acme AI Solutions is a B2B SaaS company",
  target_audience:     "Mid-market executives",
  key_differentiators: "Speed, AI-native, self-serve",
};

// ── Helper ────────────────────────────────────────────────────────────────────

function makeCtx(
  bridge: BridgeCasePack,
  sourceOutput: Record<string, unknown>,
  overrides?: Partial<BridgeRunContext>
): BridgeRunContext {
  return {
    bridge,
    sourceOutput,
    sourceNodeId: "source_node",
    targetNodeId: "target_node",
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("runBridge — AI Training P0: Practice → Rubric", () => {
  it("returns is_valid=true with valid P0 source output", async () => {
    const result = await runBridge(makeCtx(PRACTICE_TO_RUBRIC, PRACTICE_OUTPUT));
    expect(result.is_valid).toBe(true);
  });

  it("maps improved_prompt and diagnosis to target_input", async () => {
    const result = await runBridge(makeCtx(PRACTICE_TO_RUBRIC, PRACTICE_OUTPUT));
    expect(result.target_input.improved_prompt).toBe(PRACTICE_OUTPUT.improved_prompt);
    expect(result.target_input.diagnosis).toBe(PRACTICE_OUTPUT.diagnosis);
  });

  it("does NOT pass improvement_explanation to target (not in mapping)", async () => {
    const result = await runBridge(makeCtx(PRACTICE_TO_RUBRIC, PRACTICE_OUTPUT));
    expect(result.target_input).not.toHaveProperty("improvement_explanation");
  });

  it("handoff_validation is valid", async () => {
    const result = await runBridge(makeCtx(PRACTICE_TO_RUBRIC, PRACTICE_OUTPUT));
    expect(result.handoff_validation.valid).toBe(true);
    expect(result.handoff_validation.errors).toHaveLength(0);
  });

  it("target_validation is valid", async () => {
    const result = await runBridge(makeCtx(PRACTICE_TO_RUBRIC, PRACTICE_OUTPUT));
    expect(result.target_validation.valid).toBe(true);
  });

  it("context checkpoint uses partial strategy", async () => {
    const result = await runBridge(makeCtx(PRACTICE_TO_RUBRIC, PRACTICE_OUTPUT));
    expect(result.checkpoint.strategy).toBe("partial");
    expect(result.checkpoint.preserved_fields).toHaveProperty("improved_prompt");
    expect(result.checkpoint.preserved_fields).not.toHaveProperty("improvement_explanation");
  });

  it("checkpoint records correct node IDs", async () => {
    const ctx = makeCtx(PRACTICE_TO_RUBRIC, PRACTICE_OUTPUT, {
      sourceNodeId: "prompt_improvement",
      targetNodeId: "rubric_evaluation",
    });
    const result = await runBridge(ctx);
    expect(result.checkpoint.source_node_id).toBe("prompt_improvement");
    expect(result.checkpoint.target_node_id).toBe("rubric_evaluation");
  });

  it("bridge_key is correctly reported in result", async () => {
    const result = await runBridge(makeCtx(PRACTICE_TO_RUBRIC, PRACTICE_OUTPUT));
    expect(result.bridge_key).toBe("bridge.practice_output_to_rubric_evaluation.v1");
  });
});

describe("runBridge — AI Training P0: Rubric → Feedback", () => {
  it("returns is_valid=true with valid rubric output", async () => {
    const result = await runBridge(makeCtx(RUBRIC_TO_FEEDBACK, RUBRIC_OUTPUT));
    expect(result.is_valid).toBe(true);
  });

  it("maps both rubric fields to target_input", async () => {
    const result = await runBridge(makeCtx(RUBRIC_TO_FEEDBACK, RUBRIC_OUTPUT));
    expect(result.target_input.rubric_evaluation).toBe(RUBRIC_OUTPUT.rubric_evaluation);
    expect(result.target_input.quality_checklist).toBe(RUBRIC_OUTPUT.quality_checklist);
  });
});

describe("runBridge — Corporate PR: Intake → Positioning", () => {
  it("returns is_valid=true with valid intake output", async () => {
    const result = await runBridge(makeCtx(INTAKE_TO_POSITIONING, INTAKE_OUTPUT));
    expect(result.is_valid).toBe(true);
  });

  it("maps all three fields", async () => {
    const result = await runBridge(makeCtx(INTAKE_TO_POSITIONING, INTAKE_OUTPUT));
    expect(result.target_input.company_overview).toBe(INTAKE_OUTPUT.company_overview);
    expect(result.target_input.target_audience).toBe(INTAKE_OUTPUT.target_audience);
    expect(result.target_input.key_differentiators).toBe(INTAKE_OUTPUT.key_differentiators);
  });
});

describe("runBridge — validation failures", () => {
  it("is_valid=false when handoff has missing required field", async () => {
    const incompleteOutput = { improved_prompt: "Better prompt" }; // missing diagnosis
    const result = await runBridge(makeCtx(PRACTICE_TO_RUBRIC, incompleteOutput));
    expect(result.is_valid).toBe(false);
    expect(result.handoff_validation.valid).toBe(false);
  });

  it("source_validation.missing lists absent source fields", async () => {
    const result = await runBridge(makeCtx(PRACTICE_TO_RUBRIC, {}));
    // All source fields missing
    expect(result.source_validation.valid).toBe(false);
    expect(result.source_validation.missing).toContain("diagnosis");
    expect(result.source_validation.missing).toContain("improved_prompt");
  });

  it("target_validation.missing lists absent target fields after mapping", async () => {
    const result = await runBridge(makeCtx(PRACTICE_TO_RUBRIC, {}));
    expect(result.target_validation.valid).toBe(false);
    expect(result.target_validation.missing).toContain("improved_prompt");
    expect(result.target_validation.missing).toContain("diagnosis");
  });
});

describe("runBridge — handoff event writing", () => {
  it("writes handoff_event when graphRunId + handoffEventStore are provided", async () => {
    const events: HandoffEvent[] = [];
    const store: IHandoffEventStore = {
      write: vi.fn(async (e: HandoffEvent) => { events.push(e); }),
    };

    const ctx = makeCtx(PRACTICE_TO_RUBRIC, PRACTICE_OUTPUT, {
      graphRunId:        "graph-run-001",
      handoffEventStore: store,
      sourceNodeId:      "prompt_improvement",
      targetNodeId:      "rubric_evaluation",
    });

    await runBridge(ctx);

    expect(events).toHaveLength(1);
    expect(events[0]!.graph_run_id).toBe("graph-run-001");
    expect(events[0]!.bridge_key).toBe("bridge.practice_output_to_rubric_evaluation.v1");
    expect(events[0]!.source_node_id).toBe("prompt_improvement");
    expect(events[0]!.target_node_id).toBe("rubric_evaluation");
    expect(events[0]!.validation_passed).toBe(true);
    expect(events[0]!.error_count).toBe(0);
  });

  it("does NOT write handoff_event when graphRunId is absent", async () => {
    const store: IHandoffEventStore = { write: vi.fn() };
    const ctx = makeCtx(PRACTICE_TO_RUBRIC, PRACTICE_OUTPUT, {
      handoffEventStore: store,
      // no graphRunId
    });

    await runBridge(ctx);
    expect(store.write).not.toHaveBeenCalled();
  });

  it("records error_count in handoff_event for failed validation", async () => {
    const events: HandoffEvent[] = [];
    const store: IHandoffEventStore = {
      write: vi.fn(async (e: HandoffEvent) => { events.push(e); }),
    };

    const ctx = makeCtx(PRACTICE_TO_RUBRIC, {}, {
      graphRunId:        "graph-run-002",
      handoffEventStore: store,
    });

    await runBridge(ctx);

    expect(events[0]!.validation_passed).toBe(false);
    expect(events[0]!.error_count).toBeGreaterThan(0);
  });
});

describe("runBridge — security: raw source output not passed to target", () => {
  it("target_input contains only mapped fields (not raw source)", async () => {
    const sourceWithSecret = {
      ...PRACTICE_OUTPUT,
      internal_execution_plan: "VERY SECRET",
      taskflow_cx:             "SECRET PROMPT",
    };
    const result = await runBridge(makeCtx(PRACTICE_TO_RUBRIC, sourceWithSecret));
    // Target input must contain ONLY the explicitly mapped fields
    expect(result.target_input).not.toHaveProperty("internal_execution_plan");
    expect(result.target_input).not.toHaveProperty("taskflow_cx");
    expect(result.target_input).not.toHaveProperty("improvement_explanation");
    // Only mapped fields
    expect(Object.keys(result.target_input)).toEqual(
      expect.arrayContaining(["improved_prompt", "diagnosis"])
    );
  });
});
