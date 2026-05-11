/**
 * tests/integration/ai-training.test.ts
 *
 * Integration test: validates all fixtures and runs the AI Training Practice
 * 3-node graph end-to-end using MockAIProvider and in-memory stores.
 *
 * TDD requirements:
 *  T1 – All 3 CasePack MAO fixtures parse correctly
 *  T2 – Graph fixture parses with 3 nodes and 2 edges
 *  T3 – App fixture parses correctly
 *  T4 – All 2 bridge fixtures parse correctly and map fields
 *  T5 – E2E graph run returns status=success with 3 completed nodes
 *  T6 – Final output contains all required output keys
 *  T7 – Public mode: no forbidden keys in final output
 *  T8 – Standalone app (prompt improvement) runs correctly
 */

import fs from "fs";
import path from "path";
import { describe, it, expect, vi } from "vitest";
import {
  runSequentialGraph,
  MockAIProvider,
  TraceWriter,
  UsageWriter,
  runSingleCasePack,
} from "@cognitive-forge/runtime";
import type {
  GraphRunContext,
  SingleRunContext,
  IGraphRunStore,
  IRunStore,
  ITraceStore,
  IUsageStore,
  TraceRecord,
  UsageRecord,
} from "@cognitive-forge/runtime";
import type { CasePackGraph, CasePackMAO, BridgeCasePack } from "@cognitive-forge/core";
import { CasePackMAOSchema, CasePackGraphSchema, BridgeCasePackSchema, AppObjectSchema } from "@cognitive-forge/core";

// ── In-memory store factories ────────────────────────────────────────────────

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

function loadJson(subPath: string) {
  const fullPath = path.join(__dirname, "../../docs/fixtures", subPath);
  return JSON.parse(fs.readFileSync(fullPath, "utf-8"));
}

// ── Fixture paths ─────────────────────────────────────────────────────────────

const CASEPACK_FILES = [
  "casepacks/ai-training/cp.prompt.improvement.practice.v1.json",
  "casepacks/ai-training/cp.rubric.evaluation.v1.json",
  "casepacks/ai-training/cp.learner.feedback.v1.json",
];

const BRIDGE_FILES = [
  "bridges/ai-training/bridge.practice_output_to_rubric_evaluation.v1.json",
  "bridges/ai-training/bridge.rubric_evaluation_to_learner_feedback.v1.json",
];

const GRAPH_FILE = "graphs/ai-training/graph.practice_to_feedback.v1.json";
const APP_FILES = [
  "apps/ai-training/app.ai_training_practice_suite.v1.json",
  "apps/ai-training/app.prompt_improvement_practice.v1.json"
];

// ── Forbidden public keys ───────────────────────────────────────────────────

const FORBIDDEN_KEYS = [
  "casepack_json", "manifest_json", "graph_json", "taskflow_cx", "K_REF",
  "runtime_contract", "model_policy", "bridge_output_json", "source_output_json",
  "target_input_json", "context_checkpoint_json", "trace_payload",
  "repair_attempts", "execution_plan",
];

function deepScan(obj: unknown, forbidden: string[]): string[] {
  const found: string[] = [];
  function walk(val: unknown) {
    if (val && typeof val === "object") {
      for (const key of Object.keys(val as object)) {
        if (forbidden.includes(key)) found.push(key);
        walk((val as Record<string, unknown>)[key]);
      }
    }
  }
  walk(obj);
  return found;
}

// ── Build E2E context ─────────────────────────────────────────────────────────

function buildContext(publicMode = false): {
  ctx: GraphRunContext;
  graphRunStore: IGraphRunStore & { rows: Record<string, Record<string, unknown>> };
  traceStore:    ITraceStore & { events: TraceRecord[] };
  usageStore:    IUsageStore & { events: UsageRecord[] };
  maoMap:        Map<string, CasePackMAO>;
  mockOutputsRaw: any;
} {
  const graphRaw = loadJson(GRAPH_FILE);
  const graph = CasePackGraphSchema.parse(graphRaw) as CasePackGraph;

  const maoMap = new Map<string, CasePackMAO>();
  for (const file of CASEPACK_FILES) {
    const raw = loadJson(file);
    const mao = CasePackMAOSchema.parse(raw) as CasePackMAO;
    maoMap.set(mao.key, mao);
  }

  const bridgeMap = new Map<string, BridgeCasePack>();
  for (const file of BRIDGE_FILES) {
    const raw = loadJson(file);
    const bridge = BridgeCasePackSchema.parse(raw) as BridgeCasePack;
    bridgeMap.set(bridge.key, bridge);
  }

  const mockOutputsRaw = loadJson("mock-ai/mock-output-map.json");

  const traceStore    = createTraceStore();
  const usageStore    = createUsageStore();
  const graphRunStore = createGraphRunStore();
  const handoffEventStore = { write: vi.fn(async () => {}) };

  const ctx: GraphRunContext = {
    graph,
    maoMap,
    bridgeMap,
    userInput: {
      original_prompt: "Tell me about AI",
      task_context: "Blog post for beginners",
      learner_level: "beginner",
    },
    adapter:       new MockAIProvider(mockOutputsRaw, 0),
    traceWriter:   new TraceWriter(traceStore, "graph"),
    usageWriter:   new UsageWriter(usageStore),
    runStore:      createRunStore(),
    graphRunStore,
    handoffEventStore,
    workspace_id:  "integ-ai-ws",
    publicMode,
  };

  return { ctx, graphRunStore, traceStore, usageStore, maoMap, mockOutputsRaw };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Integration: AI Training Practice Suite", () => {

  it("T1: all 3 CasePack MAO fixtures parse against CasePackMAOSchema", () => {
    for (const file of CASEPACK_FILES) {
      const raw = loadJson(file);
      const result = CasePackMAOSchema.safeParse(raw);
      expect(result.success, `${file} failed schema validation`).toBe(true);
    }
  });

  it("T2: graph fixture parses with 3 nodes and 2 edges", () => {
    const raw = loadJson(GRAPH_FILE);
    const result = CasePackGraphSchema.safeParse(raw);
    expect(result.success).toBe(true);
    const graph = result.data!;
    expect(graph.nodes.length).toBe(3);
    expect(graph.edges.length).toBe(2);
    expect(graph.entry_node).toBe("prompt_improvement");
  });

  it("T3: app fixtures parse correctly", () => {
    for (const file of APP_FILES) {
      const raw = loadJson(file);
      const result = AppObjectSchema.safeParse(raw);
      expect(result.success, `${file} failed schema validation`).toBe(true);
    }
  });

  it("T4: bridge fixtures parse and map fields", () => {
    for (const file of BRIDGE_FILES) {
      const raw = loadJson(file);
      const result = BridgeCasePackSchema.safeParse(raw);
      expect(result.success, `${file} failed schema validation`).toBe(true);
    }

    const b1Raw = loadJson(BRIDGE_FILES[0]);
    expect(b1Raw.mapping_rules.some((r: any) => r.source_field === "improved_prompt")).toBe(true);

    const b2Raw = loadJson(BRIDGE_FILES[1]);
    expect(b2Raw.mapping_rules.some((r: any) => r.source_field === "rubric_evaluation")).toBe(true);
  });

  it("T5: E2E graph run returns status=success with 3 completed nodes", async () => {
    const { ctx, graphRunStore } = buildContext();
    const result = await runSequentialGraph(ctx);

    if (result.status !== "success") {
      fs.writeFileSync("ai-training-err.log", JSON.stringify(result, null, 2));
    }

    expect(result.status).toBe("success");
    expect(result.completed_nodes.length).toBe(3);

    const row = graphRunStore.rows[result.graph_run_id];
    expect(row!["status"]).toBe("success");
  });

  it("T6: final output contains all 7 required output keys", async () => {
    const { ctx } = buildContext();
    const result = await runSequentialGraph(ctx);
    expect(result.status).toBe("success");

    const requiredKeys = [
      "diagnosis",
      "improved_prompt",
      "improvement_explanation",
      "rubric_evaluation",
      "quality_checklist",
      "learner_feedback",
      "next_practice",
    ];

    for (const key of requiredKeys) {
      expect(result.final_output, `Missing key: ${key}`).toHaveProperty(key);
    }
  });

  it("T7: public mode response contains no forbidden internal keys", async () => {
    const { ctx } = buildContext(true);
    const result = await runSequentialGraph(ctx);
    const found = deepScan(result.final_output, FORBIDDEN_KEYS);
    expect(found).toEqual([]);
  });

  it("T8: standalone prompt improvement practice app runs successfully", async () => {
    const { maoMap, mockOutputsRaw } = buildContext();
    const mao = maoMap.get("casepack.prompt_improvement_practice.v1")!;

    const runStore = createRunStore();
    const traceStore = createTraceStore();
    const usageStore = createUsageStore();

    const singleCtx: any = {
      workspace_id: "integ-ai-ws",
      casepack_key: mao.key,
      mao,
      user_input: { original_prompt: "Tell me about AI" },
      adapter: new MockAIProvider(mockOutputsRaw, 0),
      runStore,
      traceWriter: new TraceWriter(traceStore, "single"),
      usageWriter: new UsageWriter(usageStore),
      publicMode: true,
    };

    const result = await runSingleCasePack(singleCtx);
    expect(result.status).toBe("success");
    expect(result.output).toHaveProperty("improved_prompt");
    expect(result.output).toHaveProperty("diagnosis");
    expect(result.output).toHaveProperty("improvement_explanation");
    
    // Check no forbidden keys in standalone run either
    const found = deepScan(result.output, FORBIDDEN_KEYS);
    expect(found).toEqual([]);
  });

});
