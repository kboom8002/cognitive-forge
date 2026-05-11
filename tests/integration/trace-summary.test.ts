import fs from "fs";
import path from "path";
import { describe, it, expect, vi } from "vitest";
import {
  runSequentialGraph,
  MockAIProvider,
  TraceWriter,
  UsageWriter,
  TraceSummaryBuilder,
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
import { CasePackGraphSchema, CasePackMAOSchema, BridgeCasePackSchema } from "@cognitive-forge/core";

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

// ── Context Builder ──────────────────────────────────────────────────────────

function buildContext(suiteDir: string, graphFile: string) {
  const graphRaw = loadJson(`graphs/${suiteDir}/${graphFile}`);
  const graph = CasePackGraphSchema.parse(graphRaw) as CasePackGraph;

  const maoFiles = fs.readdirSync(path.join(__dirname, `../../docs/fixtures/casepacks/${suiteDir}`));
  const maoMap = new Map<string, CasePackMAO>();
  for (const file of maoFiles) {
    if (!file.endsWith(".json")) continue;
    const raw = loadJson(`casepacks/${suiteDir}/${file}`);
    const mao = CasePackMAOSchema.parse(raw) as CasePackMAO;
    maoMap.set(mao.key, mao);
  }

  const bridgeFiles = fs.readdirSync(path.join(__dirname, `../../docs/fixtures/bridges/${suiteDir}`));
  const bridgeMap = new Map<string, BridgeCasePack>();
  for (const file of bridgeFiles) {
    if (!file.endsWith(".json")) continue;
    const raw = loadJson(`bridges/${suiteDir}/${file}`);
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
      company_name: "Acme AI",
      industry: "AI",
      announcement: "New launch",
      book_title: "Thinking Fast",
      book_author: "Kahneman",
      reader_goal: "Learn",
      original_prompt: "Tell me about AI",
    },
    adapter:       new MockAIProvider(mockOutputsRaw, 0),
    traceWriter:   new TraceWriter(traceStore, "graph"),
    usageWriter:   new UsageWriter(usageStore),
    runStore:      createRunStore(),
    graphRunStore,
    handoffEventStore,
    workspace_id:  "integ-trace-ws",
    publicMode:    true,
  };

  return { ctx, traceStore };
}

describe("Integration: Trace Summaries", () => {
  it("T4: Corporate PR trace shows 7 CasePack steps", async () => {
    const { ctx, traceStore } = buildContext("corporate-pr", "graph.corporate_pr_suite.v1.json");
    
    await runSequentialGraph(ctx);
    
    const summary = TraceSummaryBuilder.buildPublicSummary(traceStore.events);
    
    const nodeCompletes = summary.filter(s => s.label.startsWith("Node Completed:"));
    const bridgesCompletes = summary.filter(s => s.label === "Bridge Handoff Completed");
    
    expect(nodeCompletes.length).toBe(7);
    expect(bridgesCompletes.length).toBe(6);
  });

  it("T5: Book-to-Agent trace shows 5 CasePack steps", async () => {
    const { ctx, traceStore } = buildContext("book-to-agent", "graph.book_to_agent.v1.json");
    
    await runSequentialGraph(ctx);
    
    const summary = TraceSummaryBuilder.buildPublicSummary(traceStore.events);
    
    const nodeCompletes = summary.filter(s => s.label.startsWith("Node Completed:"));
    const bridgesCompletes = summary.filter(s => s.label === "Bridge Handoff Completed");
    
    expect(nodeCompletes.length).toBe(5);
    expect(bridgesCompletes.length).toBe(4);
  });

  it("T6: AI Training trace shows 3 CasePack steps", async () => {
    const { ctx, traceStore } = buildContext("ai-training", "graph.practice_to_feedback.v1.json");
    
    await runSequentialGraph(ctx);
    
    const summary = TraceSummaryBuilder.buildPublicSummary(traceStore.events);
    
    const nodeCompletes = summary.filter(s => s.label.startsWith("Node Completed:"));
    const bridgesCompletes = summary.filter(s => s.label === "Bridge Handoff Completed");
    
    expect(nodeCompletes.length).toBe(3);
    expect(bridgesCompletes.length).toBe(2);
  });
});
