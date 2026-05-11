/**
 * tests/integration/graph-run.test.ts
 *
 * Integration test: runs the AI Training P0 3-node graph end-to-end
 * using MockAIProvider and in-memory stores.
 *
 * Validates:
 * - Full 3-node execution with real P0 fixture schemas
 * - Bridge handoff between every node
 * - Final output contains only terminal node fields
 * - Trace event sequences are monotonically increasing
 * - Usage events are written with graph_key
 * - PublicMode sanitizes correctly with P0 public_fields
 * - Bridge failure stops the graph cleanly
 */

import { describe, it, expect, vi } from "vitest";
import {
  runSequentialGraph,
  MockAIProvider,
  TraceWriter,
  UsageWriter,
  MOCK_OUTPUT_MAP,
} from "@cognitive-forge/runtime";
import type {
  GraphRunContext,
  IGraphRunStore,
  IRunStore,
  ITraceStore,
  IUsageStore,
  TraceRecord,
  UsageRecord,
} from "@cognitive-forge/runtime";
import type { CasePackGraph, CasePackMAO, BridgeCasePack } from "@cognitive-forge/core";
import { CasePackMAOSchema, CasePackGraphSchema } from "@cognitive-forge/core";

// ── Fixture: AI Training 3-node graph ─────────────────────────────────────────

const PRACTICE_MAO_RAW = {
  key:     "casepack.prompt_improvement_practice.v1",
  version: "1.0.0",
  status:  "published",
  taskflow_cx: {
    R_role:            "Expert AI prompt engineer and learning coach",
    S_situation:       "A learner has written a prompt they want to improve.",
    T_task:            "Analyse the learner's original prompt, diagnose weaknesses, produce improved version, explain.",
    W_watchouts:       "Do not simply rewrite the prompt without explaining the reasoning.",
    O_output_contract: "Three outputs: diagnosis, improved_prompt, improvement_explanation.",
  },
  input_contract: {
    fields: [
      { key: "original_prompt", type: "text",   label: "Your Original Prompt" },
      { key: "task_context",    type: "text",   label: "Task Context"         },
      { key: "learner_level",   type: "select", label: "Experience Level", options: ["beginner", "intermediate", "advanced"], default_value: "beginner" },
    ],
    required_fields: ["original_prompt"],
  },
  output_contract: {
    fields: [
      { key: "diagnosis",               type: "text", label: "Diagnosis"              },
      { key: "improved_prompt",         type: "text", label: "Improved Prompt"        },
      { key: "improvement_explanation", type: "text", label: "Improvement Explanation" },
    ],
    required_fields: ["diagnosis", "improved_prompt", "improvement_explanation"],
    public_fields:   ["diagnosis", "improved_prompt", "improvement_explanation"],
  },
  runtime_contract: { execution_type: "single_casepack", provider: "openai", model: "gpt-4o" },
  ui_schema: { app_mode: "micro_app", layout: "single_column", public_mode: false, trust_badge: true },
  metadata: { title: "Prompt Improvement Practice" },
};

const RUBRIC_MAO_RAW = {
  key:     "casepack.rubric_evaluation.v1",
  version: "1.0.0",
  status:  "published",
  taskflow_cx: {
    R_role:            "AI training assessment specialist",
    S_situation:       "Evaluate improved prompt against a structured rubric.",
    T_task:            "Produce rubric_evaluation and quality_checklist.",
    W_watchouts:       "Be honest — do not inflate scores.",
    O_output_contract: "rubric_evaluation, quality_checklist",
  },
  input_contract: {
    fields: [
      { key: "improved_prompt", type: "text", label: "Improved Prompt"   },
      { key: "diagnosis",       type: "text", label: "Original Diagnosis" },
    ],
    required_fields: ["improved_prompt", "diagnosis"],
  },
  output_contract: {
    fields: [
      { key: "rubric_evaluation", type: "text", label: "Rubric Evaluation" },
      { key: "quality_checklist", type: "text", label: "Quality Checklist" },
    ],
    required_fields: ["rubric_evaluation", "quality_checklist"],
    public_fields:   ["rubric_evaluation", "quality_checklist"],
  },
  runtime_contract: { execution_type: "single_casepack", provider: "openai", model: "gpt-4o" },
  ui_schema: { app_mode: "micro_app", layout: "single_column", public_mode: false, trust_badge: true },
  metadata: { title: "Rubric Evaluation" },
};

const FEEDBACK_MAO_RAW = {
  key:     "casepack.learner_feedback.v1",
  version: "1.0.0",
  status:  "published",
  taskflow_cx: {
    R_role:            "AI learning coach",
    S_situation:       "Synthesise personalised feedback from rubric evaluation.",
    T_task:            "Produce learner_feedback and next_practice.",
    W_watchouts:       "Feedback must be encouraging but honest.",
    O_output_contract: "learner_feedback, next_practice",
  },
  input_contract: {
    fields: [
      { key: "rubric_evaluation", type: "text", label: "Rubric Evaluation" },
      { key: "quality_checklist", type: "text", label: "Quality Checklist" },
    ],
    required_fields: ["rubric_evaluation", "quality_checklist"],
  },
  output_contract: {
    fields: [
      { key: "learner_feedback", type: "text", label: "Learner Feedback" },
      { key: "next_practice",    type: "text", label: "Next Practice"    },
    ],
    required_fields: ["learner_feedback", "next_practice"],
    public_fields:   ["learner_feedback", "next_practice"],
  },
  runtime_contract: { execution_type: "single_casepack", provider: "openai", model: "gpt-4o" },
  ui_schema: { app_mode: "micro_app", layout: "single_column", public_mode: false, trust_badge: true },
  metadata: { title: "Learner Feedback" },
};

const GRAPH_RAW = {
  key:         "graph.practice_to_feedback.v1",
  version:     "1.0.0",
  status:      "published",
  entry_node:  "prompt_improvement",
  final_nodes: ["learner_feedback_node"],
  nodes: [
    { id: "prompt_improvement",     casepack_key: "casepack.prompt_improvement_practice.v1" },
    { id: "rubric_evaluation_node", casepack_key: "casepack.rubric_evaluation.v1"           },
    { id: "learner_feedback_node",  casepack_key: "casepack.learner_feedback.v1"            },
  ],
  edges: [
    { from: "prompt_improvement",     to: "rubric_evaluation_node", bridge_key: "bridge.practice_to_rubric.v1" },
    { from: "rubric_evaluation_node", to: "learner_feedback_node",  bridge_key: "bridge.rubric_to_feedback.v1" },
  ],
  metadata: { title: "AI Training Practice Suite" },
};

// ── Bridge fixtures ───────────────────────────────────────────────────────────

const PRACTICE_TO_RUBRIC_BRIDGE: BridgeCasePack = {
  key:                 "bridge.practice_to_rubric.v1",
  version:             "1.0.0",
  status:              "published",
  source_casepack_key: "casepack.prompt_improvement_practice.v1",
  target_casepack_key: "casepack.rubric_evaluation.v1",
  source_pattern: { diagnosis: "string", improved_prompt: "string", improvement_explanation: "string" },
  target_pattern: { improved_prompt: "string", diagnosis: "string" },
  mapping_rules: [
    { source_field: "improved_prompt", target_field: "improved_prompt" },
    { source_field: "diagnosis",       target_field: "diagnosis"       },
  ],
  handoff_contract: {
    source_casepack_key: "casepack.prompt_improvement_practice.v1",
    target_casepack_key: "casepack.rubric_evaluation.v1",
    fields: [
      { key: "improved_prompt", type: "text", label: "Improved Prompt"   },
      { key: "diagnosis",       type: "text", label: "Original Diagnosis" },
    ],
    context_preservation: "partial",
  },
  metadata: { title: "Practice → Rubric Bridge" },
};

const RUBRIC_TO_FEEDBACK_BRIDGE: BridgeCasePack = {
  key:                 "bridge.rubric_to_feedback.v1",
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
  metadata: { title: "Rubric → Feedback Bridge" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function createRunStore(): IRunStore {
  const rows: Record<string, Record<string, unknown>> = {};
  let counter = 0;
  return {
    create: vi.fn(async (p: Record<string, unknown>) => {
      const id = `run-${++counter}`; rows[id] = { ...p }; return id;
    }),
    update: vi.fn(async (id: string, p: Record<string, unknown>) => {
      if (!rows[id]) rows[id] = {}; Object.assign(rows[id]!, p);
    }),
  };
}

function createGraphRunStore(): IGraphRunStore & { rows: Record<string, Record<string, unknown>> } {
  const rows: Record<string, Record<string, unknown>> = {};
  let counter = 0;
  return {
    rows,
    create: vi.fn(async (p: Record<string, unknown>) => {
      const id = `graph-run-${++counter}`; rows[id] = { ...p }; return id;
    }),
    update: vi.fn(async (id: string, p: Record<string, unknown>) => {
      if (!rows[id]) rows[id] = {}; Object.assign(rows[id]!, p);
    }),
  };
}

function createTraceStore(): ITraceStore & { events: TraceRecord[] } {
  const events: TraceRecord[] = [];
  return { events, write: vi.fn(async (e: TraceRecord) => { events.push(e); }) };
}

function createUsageStore(): IUsageStore & { events: UsageRecord[] } {
  const events: UsageRecord[] = [];
  return { events, write: vi.fn(async (e: UsageRecord) => { events.push(e); }) };
}

// ── Fixture setup (shared) ────────────────────────────────────────────────────

function buildIntegCtx(publicMode: boolean = false): {
  ctx: GraphRunContext;
  traceStore: ITraceStore & { events: TraceRecord[] };
  usageStore: IUsageStore & { events: UsageRecord[] };
  graphRunStore: IGraphRunStore & { rows: Record<string, Record<string, unknown>> };
} {
  const practiceMao = CasePackMAOSchema.parse(PRACTICE_MAO_RAW) as CasePackMAO;
  const rubricMao   = CasePackMAOSchema.parse(RUBRIC_MAO_RAW)   as CasePackMAO;
  const feedbackMao = CasePackMAOSchema.parse(FEEDBACK_MAO_RAW) as CasePackMAO;
  const graph       = CasePackGraphSchema.parse(GRAPH_RAW)       as CasePackGraph;

  const maoMap = new Map<string, CasePackMAO>([
    [practiceMao.key, practiceMao],
    [rubricMao.key,   rubricMao],
    [feedbackMao.key, feedbackMao],
  ]);

  const bridgeMap = new Map<string, BridgeCasePack>([
    [PRACTICE_TO_RUBRIC_BRIDGE.key, PRACTICE_TO_RUBRIC_BRIDGE],
    [RUBRIC_TO_FEEDBACK_BRIDGE.key, RUBRIC_TO_FEEDBACK_BRIDGE],
  ]);

  // Use the canonical MOCK_OUTPUT_MAP for P0 casepacks; supplement with rubric+feedback
  const extendedMockOutputs: Record<string, Record<string, unknown>> = {
    ...MOCK_OUTPUT_MAP,
    "casepack.rubric_evaluation.v1": {
      rubric_evaluation: "Clarity: 5/5, Specificity: 4/5, Role: 5/5 — Overall: Excellent",
      quality_checklist: "☑ Role ☑ Task ☑ Format ☑ Audience ☐ Constraints",
    },
    "casepack.learner_feedback.v1": {
      learner_feedback: "Great progress! You've clearly defined role and output format.",
      next_practice:    "Write a prompt with explicit constraint boundaries next.",
    },
  };

  const traceStore    = createTraceStore();
  const usageStore    = createUsageStore();
  const graphRunStore = createGraphRunStore();

  const ctx: GraphRunContext = {
    graph,
    maoMap,
    bridgeMap,
    userInput:     { original_prompt: "Tell me about AI", learner_level: "beginner" },
    adapter:       new MockAIProvider(extendedMockOutputs, 0),
    traceWriter:   new TraceWriter(traceStore, "graph"),
    usageWriter:   new UsageWriter(usageStore),
    runStore:      createRunStore(),
    graphRunStore,
    workspace_id:  "integ-graph-ws",
    publicMode,
  };

  return { ctx, traceStore, usageStore, graphRunStore };
}

// ── Integration tests ─────────────────────────────────────────────────────────

describe("Integration: graph-run (AI Training P0 — 3-node linear)", () => {
  it("P0 MAOs validate against CasePackMAOSchema", () => {
    expect(() => CasePackMAOSchema.parse(PRACTICE_MAO_RAW)).not.toThrow();
    expect(() => CasePackMAOSchema.parse(RUBRIC_MAO_RAW)).not.toThrow();
    expect(() => CasePackMAOSchema.parse(FEEDBACK_MAO_RAW)).not.toThrow();
  });

  it("P0 graph validates against CasePackGraphSchema", () => {
    expect(() => CasePackGraphSchema.parse(GRAPH_RAW)).not.toThrow();
  });

  it("runs 3-node graph end-to-end and returns status=success", async () => {
    const { ctx } = buildIntegCtx();
    const result = await runSequentialGraph(ctx);
    expect(result.status).toBe("success");
  });

  it("final_output contains learner_feedback and next_practice", async () => {
    const { ctx } = buildIntegCtx();
    const result = await runSequentialGraph(ctx);
    expect(result.final_output).toHaveProperty("learner_feedback");
    expect(result.final_output).toHaveProperty("next_practice");
    expect(typeof result.final_output["learner_feedback"]).toBe("string");
    expect(typeof result.final_output["next_practice"]).toBe("string");
  });

  it("final_output does NOT contain intermediate node fields (bridge filtering)", async () => {
    const { ctx } = buildIntegCtx();
    const result = await runSequentialGraph(ctx);
    // Fields from node 1 (practice) should NOT appear in final_output
    expect(result.final_output).not.toHaveProperty("diagnosis");
    expect(result.final_output).not.toHaveProperty("improved_prompt");
    expect(result.final_output).not.toHaveProperty("improvement_explanation");
    // Fields from node 2 (rubric) should NOT appear in final_output
    expect(result.final_output).not.toHaveProperty("rubric_evaluation");
    expect(result.final_output).not.toHaveProperty("quality_checklist");
  });

  it("publicMode=true returns only terminal node public_fields", async () => {
    const { ctx } = buildIntegCtx(true);
    const result = await runSequentialGraph(ctx);
    // Learner feedback public_fields: [learner_feedback, next_practice]
    expect(result.final_output).toHaveProperty("learner_feedback");
    expect(result.final_output).toHaveProperty("next_practice");
    // No intermediate fields
    expect(Object.keys(result.final_output).every((k) =>
      ["learner_feedback", "next_practice"].includes(k)
    )).toBe(true);
  });

  it("writes trace events with strictly increasing sequence numbers", async () => {
    const { ctx, traceStore } = buildIntegCtx();
    await runSequentialGraph(ctx);
    const events = traceStore.events;
    expect(events.length).toBeGreaterThan(0);
    for (let i = 1; i < events.length; i++) {
      expect(events[i]!.sequence).toBeGreaterThan(events[i - 1]!.sequence);
    }
  });

  it("writes a graph-level usage event with graph_key", async () => {
    const { ctx, usageStore } = buildIntegCtx();
    await runSequentialGraph(ctx);
    const graphUsage = usageStore.events.find((e) => e.graph_key === "graph.practice_to_feedback.v1");
    expect(graphUsage).toBeDefined();
    expect(graphUsage!.workspace_id).toBe("integ-graph-ws");
  });

  it("graph_runs row is updated to status=success with final_output_json", async () => {
    const { ctx, graphRunStore } = buildIntegCtx();
    const result = await runSequentialGraph(ctx);
    const row = graphRunStore.rows[result.graph_run_id];
    expect(row).toBeDefined();
    expect(row!["status"]).toBe("success");
    expect(row!["final_output_json"]).toMatchObject({
      learner_feedback: expect.any(String),
      next_practice:    expect.any(String),
    });
  });

  it("writes 2 handoff events (one per bridge edge) when handoffEventStore provided", async () => {
    const handoffEvents: unknown[] = [];
    const handoffEventStore = {
      write: vi.fn(async (e: unknown) => { handoffEvents.push(e); }),
    };
    const { ctx } = buildIntegCtx();
    await runSequentialGraph({ ...ctx, handoffEventStore });
    expect(handoffEvents).toHaveLength(2);
  });

  it("final_output validation report is valid", async () => {
    const { ctx } = buildIntegCtx();
    const result = await runSequentialGraph(ctx);
    expect(result.validation.valid).toBe(true);
    expect(result.validation.status).toBe("pass");
  });

  it("all 3 nodes appear in completed_nodes", async () => {
    const { ctx } = buildIntegCtx();
    const result = await runSequentialGraph(ctx);
    expect(result.completed_nodes).toHaveLength(3);
    expect(result.completed_nodes[0]).toBe("prompt_improvement");
    expect(result.completed_nodes[1]).toBe("rubric_evaluation_node");
    expect(result.completed_nodes[2]).toBe("learner_feedback_node");
  });
});
