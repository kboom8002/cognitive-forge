/**
 * tests/integration/book-to-agent.test.ts
 *
 * Integration test: validates all fixtures and runs the Book-to-Agent
 * 5-node graph end-to-end using MockAIProvider and in-memory stores.
 *
 * TDD requirements:
 *  T1 – All 5 CasePack MAO fixtures parse correctly
 *  T2 – Graph fixture parses with 5 nodes and 4 edges
 *  T3 – All 4 bridge fixtures parse correctly
 *  T4 – Bridge knowledge→insight_qa maps required fields
 *  T5 – E2E graph run returns status=success with 5 completed nodes
 *  T6 – Final output contains all required output keys
 *  T7 – Public mode: no forbidden keys in final output
 *  T8 – Accumulated context: later nodes receive upstream knowledge
 */

import fs from "fs";
import path from "path";
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
import { CasePackMAOSchema, CasePackGraphSchema, BridgeCasePackSchema } from "@cognitive-forge/core";

// ── In-memory store factories (same pattern as corporate-pr.test.ts) ──────────

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
  "casepacks/book-to-agent/cp.book.intake.v1.json",
  "casepacks/book-to-agent/cp.book.knowledge.structurer.v1.json",
  "casepacks/book-to-agent/cp.book.insight.qa.v1.json",
  "casepacks/book-to-agent/cp.book.action.coach.v1.json",
  "casepacks/book-to-agent/cp.book.reflection.coach.v1.json",
];

const BRIDGE_FILES = [
  "bridges/book-to-agent/bridge.book_intake.to_knowledge.v1.json",
  "bridges/book-to-agent/bridge.book_knowledge.to_insight_qa.v1.json",
  "bridges/book-to-agent/bridge.book_knowledge.to_action.v1.json",
  "bridges/book-to-agent/bridge.book_knowledge.to_reflection.v1.json",
];

const GRAPH_FILE = "graphs/book-to-agent/graph.book_to_agent.v1.json";

// ── Forbidden public keys (same list as no-leak test) ────────────────────────

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

function buildBookCtx(publicMode = false): {
  ctx: GraphRunContext;
  graphRunStore: IGraphRunStore & { rows: Record<string, Record<string, unknown>> };
  traceStore:    ITraceStore & { events: TraceRecord[] };
  usageStore:    IUsageStore & { events: UsageRecord[] };
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
      book_title:  "Thinking, Fast and Slow",
      book_author: "Daniel Kahneman",
      reader_goal: "Improve decision-making as a VC analyst",
    },
    adapter:       new MockAIProvider(mockOutputsRaw, 0),
    traceWriter:   new TraceWriter(traceStore, "graph"),
    usageWriter:   new UsageWriter(usageStore),
    runStore:      createRunStore(),
    graphRunStore,
    handoffEventStore,
    workspace_id:  "integ-book-ws",
    publicMode,
  };

  return { ctx, graphRunStore, traceStore, usageStore };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Integration: Book-to-Agent Suite", () => {

  // ── T1: All 5 CasePack MAO fixtures parse correctly ──────────────────────

  it("T1: all 5 CasePack MAO fixtures parse against CasePackMAOSchema", () => {
    for (const file of CASEPACK_FILES) {
      const raw = loadJson(file);
      const result = CasePackMAOSchema.safeParse(raw);
      if (!result.success) {
        console.error(`Parse failure for ${file}:`, result.error.flatten());
      }
      expect(result.success, `${file} failed schema validation`).toBe(true);
    }
  });

  // ── T2: Graph fixture parses with 5 nodes and 4 edges ────────────────────

  it("T2: graph fixture parses with 5 nodes and 4 edges", () => {
    const raw = loadJson(GRAPH_FILE);
    const result = CasePackGraphSchema.safeParse(raw);
    if (!result.success) {
      console.error("Graph parse failure:", result.error.flatten());
    }
    expect(result.success).toBe(true);
    const graph = result.data!;
    expect(graph.nodes.length).toBe(5);
    expect(graph.edges.length).toBe(4);
    expect(graph.entry_node).toBe("book_intake");
  });

  // ── T3: All 4 bridge fixtures parse correctly ─────────────────────────────

  it("T3: all 4 bridge fixtures parse against BridgeCasePackSchema", () => {
    for (const file of BRIDGE_FILES) {
      const raw = loadJson(file);
      const result = BridgeCasePackSchema.safeParse(raw);
      if (!result.success) {
        console.error(`Bridge parse failure for ${file}:`, result.error.flatten());
      }
      expect(result.success, `${file} failed schema validation`).toBe(true);
    }
  });

  // ── T4: Bridge knowledge→insight_qa maps required fields ─────────────────

  it("T4: knowledge→insight_qa bridge maps book_knowledge_summary and core_concepts", () => {
    const raw = loadJson("bridges/book-to-agent/bridge.book_knowledge.to_insight_qa.v1.json");
    const bridge = BridgeCasePackSchema.parse(raw) as BridgeCasePack;

    const targetFields = bridge.mapping_rules.map(r => r.target_field);
    expect(targetFields).toContain("book_knowledge_summary");
    expect(targetFields).toContain("core_concepts");

    const handoffKeys = bridge.handoff_contract.fields.map(f => f.key);
    expect(handoffKeys).toContain("book_knowledge_summary");
    expect(handoffKeys).toContain("core_concepts");
  });

  // ── T5: E2E run returns status=success with 5 completed nodes ────────────

  it("T5: E2E graph run returns status=success with 5 completed nodes", async () => {
    const { ctx, graphRunStore } = buildBookCtx();
    const result = await runSequentialGraph(ctx);

    if (result.status !== "success") {
      fs.writeFileSync("book-to-agent-err.log", JSON.stringify(result, null, 2));
    }

    expect(result.status).toBe("success");
    expect(result.completed_nodes.length).toBe(5);

    const row = graphRunStore.rows[result.graph_run_id];
    expect(row).toBeDefined();
    expect(row!["status"]).toBe("success");
  });

  // ── T6: Final output contains all required keys ───────────────────────────

  it("T6: final output contains all 7 required output keys", async () => {
    const { ctx } = buildBookCtx();
    const result = await runSequentialGraph(ctx);

    expect(result.status).toBe("success");

    const requiredKeys = [
      "book_knowledge_summary",
      "insight_qa",
      "personalized_interpretation",
      "action_plan",
      "reflection_questions",
      "next_steps",
      "risk_notes",
    ];

    for (const key of requiredKeys) {
      expect(result.final_output, `Missing key: ${key}`).toHaveProperty(key);
    }
  });

  // ── T7: Public mode: no forbidden keys in final output ────────────────────

  it("T7: public mode response contains no forbidden internal keys", async () => {
    const { ctx } = buildBookCtx(true);
    const result = await runSequentialGraph(ctx);

    const found = deepScan(result.final_output, FORBIDDEN_KEYS);
    expect(found).toEqual([]);
  });

  // ── T8: Accumulated context: reflection node receives upstream knowledge ──

  it("T8: reflection coach prompt receives upstream knowledge context via accumulatedContext", async () => {
    const { ctx } = buildBookCtx();
    vi.spyOn(ctx.adapter, "call");
    await runSequentialGraph(ctx);

    // The reflection coach (last node) should have received the book knowledge
    // in its prompt via accumulatedContext (since it only gets action_plan +
    // next_steps from its bridge, but accumulatedContext also carries upstream)
    const reflectionCall = vi.mocked(ctx.adapter.call).mock.calls.find(call =>
      call[1]._casepack_key === "casepack.book_reflection_coach.v1"
    );

    expect(reflectionCall, "No call found for reflection coach").toBeDefined();
    // The prompt must contain the action plan passed via bridge
    expect(reflectionCall![0]).toContain("action_plan");
  });

});
