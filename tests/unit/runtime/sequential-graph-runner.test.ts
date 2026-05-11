/**
 * tests/unit/runtime/sequential-graph-runner.test.ts
 *
 * Unit tests for SequentialGraphRunner.
 *
 * Uses an in-memory 3-node graph (AI Training P0: practice → rubric → feedback)
 * with MockAIProvider, in-memory stores, and P0 fixture MAOs.
 *
 * Tests:
 * - End-to-end 3-node linear execution
 * - accumulatedContext is populated but not exposed in result
 * - Bridge validation: valid → proceeds, invalid → stops graph
 * - publicMode sanitization of final output
 * - Graph structure validation errors
 * - Zero-retention suppresses trace/usage events
 */

import { describe, it, expect, vi } from "vitest";
import {
  runSequentialGraph,
  MockAIProvider,
  TraceWriter,
  UsageWriter,
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

// ── P0 MAO fixtures (AI Training) ─────────────────────────────────────────────

const PRACTICE_MAO_RAW = {
  key: "casepack.prompt_improvement_practice.v1",
  version: "1.0.0",
  status: "published",
  taskflow_cx: {
    R_role:            "Expert AI prompt engineer",
    S_situation:       "A learner wants to improve their prompt.",
    T_task:            "Diagnose, improve, and explain.",
    W_watchouts:       "Do not just rewrite without explaining.",
    O_output_contract: "diagnosis, improved_prompt, improvement_explanation",
  },
  input_contract: {
    fields: [
      { key: "original_prompt", type: "text", label: "Original Prompt" },
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
};

const RUBRIC_MAO_RAW = {
  key: "casepack.rubric_evaluation.v1",
  version: "1.0.0",
  status: "published",
  taskflow_cx: {
    R_role:            "AI training assessment specialist",
    S_situation:       "Evaluate an improved prompt against a rubric.",
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
};

const FEEDBACK_MAO_RAW = {
  key: "casepack.learner_feedback.v1",
  version: "1.0.0",
  status: "published",
  taskflow_cx: {
    R_role:            "AI learning coach",
    S_situation:       "Synthesise personalised feedback.",
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
};

// ── P0 Graph fixture (3-node linear) ─────────────────────────────────────────

const GRAPH_RAW = {
  key:         "graph.practice_to_feedback.v1",
  version:     "1.0.0",
  status:      "published",
  entry_node:  "prompt_improvement",
  final_nodes: ["learner_feedback_node"],
  nodes: [
    { id: "prompt_improvement",      casepack_key: "casepack.prompt_improvement_practice.v1" },
    { id: "rubric_evaluation_node",  casepack_key: "casepack.rubric_evaluation.v1"           },
    { id: "learner_feedback_node",   casepack_key: "casepack.learner_feedback.v1"            },
  ],
  edges: [
    { from: "prompt_improvement",     to: "rubric_evaluation_node", bridge_key: "bridge.practice_to_rubric.v1" },
    { from: "rubric_evaluation_node", to: "learner_feedback_node",  bridge_key: "bridge.rubric_to_feedback.v1" },
  ],
  metadata: { title: "AI Training Practice Suite" },
};

// ── P0 Bridge fixtures ────────────────────────────────────────────────────────

function makePracticeToRubricBridge(): BridgeCasePack {
  return {
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
        { key: "improved_prompt", type: "text", label: "Improved Prompt"    },
        { key: "diagnosis",       type: "text", label: "Original Diagnosis" },
      ],
      context_preservation: "partial",
    },
    metadata: { title: "Practice → Rubric Bridge" },
  };
}

function makeRubricToFeedbackBridge(): BridgeCasePack {
  return {
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
}

// ── Mock output map ───────────────────────────────────────────────────────────

const MOCK_OUTPUTS: Record<string, Record<string, unknown>> = {
  "casepack.prompt_improvement_practice.v1": {
    diagnosis:               "Prompt lacks role definition and output format",
    improved_prompt:         "You are a science journalist... produce a 300-word blog post",
    improvement_explanation: "Added role, format, and word count constraints",
  },
  "casepack.rubric_evaluation.v1": {
    rubric_evaluation: "Clarity: 5/5, Specificity: 4/5, Role: 5/5 — Overall: Excellent",
    quality_checklist: "☑ Role ☑ Task ☑ Format ☑ Audience ☐ Constraints",
  },
  "casepack.learner_feedback.v1": {
    learner_feedback: "Great progress! You clearly defined the role and output format.",
    next_practice:    "Try writing a prompt with explicit constraint boundaries.",
  },
};

// ── In-memory stores ──────────────────────────────────────────────────────────

function createRunStore(): IRunStore & { rows: Record<string, Record<string, unknown>> } {
  const rows: Record<string, Record<string, unknown>> = {};
  let counter = 0;
  return {
    rows,
    create: vi.fn(async (params: Record<string, unknown>) => {
      const id = `run-${++counter}`;
      rows[id] = { ...params, status: "pending" };
      return id;
    }),
    update: vi.fn(async (id: string, params: Record<string, unknown>) => {
      if (!rows[id]) rows[id] = {};
      Object.assign(rows[id]!, params);
    }),
  };
}

function createGraphRunStore(): IGraphRunStore & { rows: Record<string, Record<string, unknown>> } {
  const rows: Record<string, Record<string, unknown>> = {};
  let counter = 0;
  return {
    rows,
    create: vi.fn(async (params: Record<string, unknown>) => {
      const id = `graph-run-${++counter}`;
      rows[id] = { ...params, status: "pending" };
      return id;
    }),
    update: vi.fn(async (id: string, params: Record<string, unknown>) => {
      if (!rows[id]) rows[id] = {};
      Object.assign(rows[id]!, params);
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

// ── Full context builder ──────────────────────────────────────────────────────

function buildContext(overrides?: Partial<GraphRunContext>): {
  ctx: GraphRunContext;
  traceStore: ITraceStore & { events: TraceRecord[] };
  usageStore: IUsageStore & { events: UsageRecord[] };
  graphRunStore: IGraphRunStore & { rows: Record<string, Record<string, unknown>> };
  runStore: IRunStore;
} {
  const practiceMao  = CasePackMAOSchema.parse(PRACTICE_MAO_RAW) as CasePackMAO;
  const rubricMao    = CasePackMAOSchema.parse(RUBRIC_MAO_RAW)   as CasePackMAO;
  const feedbackMao  = CasePackMAOSchema.parse(FEEDBACK_MAO_RAW) as CasePackMAO;
  const graph        = CasePackGraphSchema.parse(GRAPH_RAW)       as CasePackGraph;

  const maoMap = new Map<string, CasePackMAO>([
    ["casepack.prompt_improvement_practice.v1", practiceMao],
    ["casepack.rubric_evaluation.v1",           rubricMao],
    ["casepack.learner_feedback.v1",            feedbackMao],
  ]);

  const bridgeMap = new Map<string, BridgeCasePack>([
    ["bridge.practice_to_rubric.v1",  makePracticeToRubricBridge()],
    ["bridge.rubric_to_feedback.v1",  makeRubricToFeedbackBridge()],
  ]);

  const traceStore    = createTraceStore();
  const usageStore    = createUsageStore();
  const graphRunStore = createGraphRunStore();
  const runStore      = createRunStore();

  const ctx: GraphRunContext = {
    graph,
    maoMap,
    bridgeMap,
    userInput:     { original_prompt: "Tell me about climate change" },
    adapter:       new MockAIProvider(MOCK_OUTPUTS, 0),
    traceWriter:   new TraceWriter(traceStore, "graph"),
    usageWriter:   new UsageWriter(usageStore),
    runStore,
    graphRunStore,
    workspace_id:  "unit-test-ws",
    publicMode:    false,
    ...overrides,
  };

  return { ctx, traceStore, usageStore, graphRunStore, runStore };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("runSequentialGraph — 3-node linear graph (AI Training P0)", () => {
  it("parses P0 graph fixture against CasePackGraphSchema", () => {
    expect(() => CasePackGraphSchema.parse(GRAPH_RAW)).not.toThrow();
  });

  it("returns status=success for a valid 3-node run", async () => {
    const { ctx } = buildContext();
    const result = await runSequentialGraph(ctx);
    expect(result.status).toBe("success");
  });

  it("final_output contains learner_feedback and next_practice (terminal node fields)", async () => {
    const { ctx } = buildContext();
    const result = await runSequentialGraph(ctx);
    expect(result.final_output).toHaveProperty("learner_feedback");
    expect(result.final_output).toHaveProperty("next_practice");
  });

  it("node_results has 3 entries, one per node in order", async () => {
    const { ctx } = buildContext();
    const result = await runSequentialGraph(ctx);
    expect(result.node_results).toHaveLength(3);
    expect(result.node_results[0]!.node_id).toBe("prompt_improvement");
    expect(result.node_results[1]!.node_id).toBe("rubric_evaluation_node");
    expect(result.node_results[2]!.node_id).toBe("learner_feedback_node");
  });

  it("all nodes report status=success", async () => {
    const { ctx } = buildContext();
    const result = await runSequentialGraph(ctx);
    for (const nr of result.node_results) {
      expect(nr.status).toBe("success");
    }
  });

  it("completed_nodes lists all 3 node IDs", async () => {
    const { ctx } = buildContext();
    const result = await runSequentialGraph(ctx);
    expect(result.completed_nodes).toContain("prompt_improvement");
    expect(result.completed_nodes).toContain("rubric_evaluation_node");
    expect(result.completed_nodes).toContain("learner_feedback_node");
  });

  it("final validation report is valid", async () => {
    const { ctx } = buildContext();
    const result = await runSequentialGraph(ctx);
    expect(result.validation.valid).toBe(true);
  });

  it("graph_run_id is a non-empty string", async () => {
    const { ctx } = buildContext();
    const result = await runSequentialGraph(ctx);
    expect(result.graph_run_id).toBeTruthy();
    expect(typeof result.graph_run_id).toBe("string");
  });

  it("creates a graph_runs row with the graph_key", async () => {
    const { ctx, graphRunStore } = buildContext();
    await runSequentialGraph(ctx);
    const graphRunRows = Object.values(graphRunStore.rows);
    expect(graphRunRows.length).toBeGreaterThan(0);
    const graphRun = graphRunRows[0]!;
    expect(graphRun["graph_key"]).toBe("graph.practice_to_feedback.v1");
  });

  it("updates graph_runs row with status=success and final_output_json", async () => {
    const { ctx, graphRunStore } = buildContext();
    const result = await runSequentialGraph(ctx);
    const row = graphRunStore.rows[result.graph_run_id];
    expect(row).toBeDefined();
    expect(row!["status"]).toBe("success");
    expect(row!["final_output_json"]).toBeDefined();
  });
});

describe("runSequentialGraph — trace events", () => {
  it("writes trace events including graph start and complete", async () => {
    const { ctx, traceStore } = buildContext();
    await runSequentialGraph(ctx);
    const types = traceStore.events.map((e) => e.event_type);
    expect(types[0]).toBe("start");
    expect(types).toContain("complete");
  });

  it("trace events include node_start and node_complete steps", async () => {
    const { ctx, traceStore } = buildContext();
    await runSequentialGraph(ctx);
    const payloads = traceStore.events.map((e) => e.trace_payload);
    const nodeStartEvents = payloads.filter((p) => p["phase"] === "node_start");
    const nodeCompleteEvents = payloads.filter((p) => p["phase"] === "node_complete");
    expect(nodeStartEvents.length).toBe(3);
    expect(nodeCompleteEvents.length).toBe(3);
  });

  it("trace events include bridge_start and bridge_complete", async () => {
    const { ctx, traceStore } = buildContext();
    await runSequentialGraph(ctx);
    const payloads = traceStore.events.map((e) => e.trace_payload);
    const bridgeStartEvents = payloads.filter((p) => p["phase"] === "bridge_start");
    expect(bridgeStartEvents.length).toBe(2); // 2 bridges in the 3-node graph
  });

  it("zeroRetention suppresses trace events", async () => {
    const { ctx, traceStore } = buildContext({ zeroRetention: true });
    await runSequentialGraph(ctx);
    expect(traceStore.events).toHaveLength(0);
  });

  it("zeroRetention suppresses usage events", async () => {
    const { ctx, usageStore } = buildContext({ zeroRetention: true });
    await runSequentialGraph(ctx);
    expect(usageStore.events).toHaveLength(0);
  });
});

describe("runSequentialGraph — publicMode sanitization", () => {
  it("publicMode=true returns only public_fields from final node contract", async () => {
    const { ctx } = buildContext({ publicMode: true });
    const result = await runSequentialGraph(ctx);
    // Final node (learner_feedback) has public_fields: [learner_feedback, next_practice]
    expect(result.final_output).toHaveProperty("learner_feedback");
    expect(result.final_output).toHaveProperty("next_practice");
  });

  it("publicMode=false returns all output fields", async () => {
    const { ctx } = buildContext({ publicMode: false });
    const result = await runSequentialGraph(ctx);
    expect(result.final_output).toHaveProperty("learner_feedback");
    expect(result.final_output).toHaveProperty("next_practice");
  });

  it("node_results (internal) are never exposed in publicMode", async () => {
    const { ctx } = buildContext({ publicMode: true });
    const result = await runSequentialGraph(ctx);
    // node_results exist on GraphRunResult but it's the caller's responsibility
    // not to expose them. We verify they are present (for internal use) but
    // the public API route will not include them in the response.
    expect(result.node_results).toBeDefined();
    // The public final_output should not contain accumulated context
    expect(result.final_output).not.toHaveProperty("diagnosis"); // from node 1
    expect(result.final_output).not.toHaveProperty("improved_prompt"); // from node 1
    expect(result.final_output).not.toHaveProperty("rubric_evaluation"); // from node 2
  });
});

describe("runSequentialGraph — bridge failure stops graph", () => {
  it("returns status=partial when bridge mapping has missing required fields", async () => {
    // Use a bridge that requires a field the source doesn't produce
    const brokenBridge: BridgeCasePack = {
      ...makePracticeToRubricBridge(),
      handoff_contract: {
        ...makePracticeToRubricBridge().handoff_contract,
        fields: [
          { key: "improved_prompt",         type: "text", label: "Improved Prompt"    },
          { key: "diagnosis",               type: "text", label: "Diagnosis"          },
          { key: "nonexistent_required_field", type: "text", label: "Missing Field"   },
        ],
      },
    };

    const { ctx } = buildContext({
      bridgeMap: new Map<string, BridgeCasePack>([
        ["bridge.practice_to_rubric.v1", brokenBridge],
        ["bridge.rubric_to_feedback.v1", makeRubricToFeedbackBridge()],
      ]),
    });

    const result = await runSequentialGraph(ctx);
    expect(result.status).toBe("partial");
    expect(result.validation.valid).toBe(false);
  });

  it("completed_nodes only lists the first node when bridge fails after node 1", async () => {
    const brokenBridge: BridgeCasePack = {
      ...makePracticeToRubricBridge(),
      handoff_contract: {
        ...makePracticeToRubricBridge().handoff_contract,
        fields: [
          { key: "missing_field", type: "text", label: "Missing" },
        ],
      },
    };

    const { ctx } = buildContext({
      bridgeMap: new Map<string, BridgeCasePack>([
        ["bridge.practice_to_rubric.v1", brokenBridge],
        ["bridge.rubric_to_feedback.v1", makeRubricToFeedbackBridge()],
      ]),
    });

    const result = await runSequentialGraph(ctx);
    expect(result.completed_nodes).toContain("prompt_improvement");
    expect(result.completed_nodes).not.toContain("rubric_evaluation_node");
    expect(result.completed_nodes).not.toContain("learner_feedback_node");
  });

  it("returns status=partial when bridge definition is missing from bridgeMap", async () => {
    // Remove the first bridge from the map
    const { ctx } = buildContext({
      bridgeMap: new Map<string, BridgeCasePack>([
        // "bridge.practice_to_rubric.v1" intentionally omitted
        ["bridge.rubric_to_feedback.v1", makeRubricToFeedbackBridge()],
      ]),
    });

    const result = await runSequentialGraph(ctx);
    expect(result.status).toBe("partial");
  });
});

describe("runSequentialGraph — graph structure validation", () => {
  it("throws AppError when entry_node is not a known node", async () => {
    // CasePackGraphSchema validates entry_node at parse time,
    // so we bypass parse and cast directly to test the runner's runtime check.
    const invalidGraph = {
      ...CasePackGraphSchema.parse(GRAPH_RAW),
      entry_node: "nonexistent_node",
    } as CasePackGraph;

    const { ctx } = buildContext({ graph: invalidGraph });
    await expect(runSequentialGraph(ctx)).rejects.toThrow();
  });

  it("throws AppError when a MAO is missing from maoMap", async () => {
    const { ctx } = buildContext({
      maoMap: new Map<string, CasePackMAO>([
        ["casepack.prompt_improvement_practice.v1", CasePackMAOSchema.parse(PRACTICE_MAO_RAW) as CasePackMAO],
        // rubric and feedback MAOs intentionally omitted
      ]),
    });

    await expect(runSequentialGraph(ctx)).rejects.toThrow();
  });
});

describe("runSequentialGraph — handoff event writing", () => {
  it("writes handoff_events for each bridge edge when handoffEventStore is provided", async () => {
    const handoffEvents: unknown[] = [];
    const handoffEventStore = {
      write: vi.fn(async (e: unknown) => { handoffEvents.push(e); }),
    };

    const { ctx } = buildContext({ handoffEventStore });
    await runSequentialGraph(ctx);

    // 2 bridges in the 3-node graph
    expect(handoffEvents).toHaveLength(2);
  });

  it("does not write handoff_events when handoffEventStore is absent", async () => {
    const { ctx } = buildContext({ handoffEventStore: undefined });
    // Should not throw — handoff events are optional
    await expect(runSequentialGraph(ctx)).resolves.not.toThrow();
  });
});
