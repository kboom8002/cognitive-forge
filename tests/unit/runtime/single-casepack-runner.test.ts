/**
 * tests/unit/runtime/single-casepack-runner.test.ts
 *
 * Unit tests for SingleCasePackRunner.runSingleCasePack().
 * Uses fully mocked stores and MockAIProvider.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  runSingleCasePack,
  MockAIProvider,
  TraceWriter,
  UsageWriter,
  FALLBACK_PLACEHOLDER,
} from "@cognitive-forge/runtime";
import type {
  IRunStore,
  ITraceStore,
  IUsageStore,
  RunContext,
  TraceRecord,
  UsageRecord,
} from "@cognitive-forge/runtime";
import type { CasePackMAO } from "@cognitive-forge/core";
import { AppError } from "@cognitive-forge/core";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MAO: CasePackMAO = {
  key:     "casepack.test_runner.v1",
  version: "1.0.0",
  status:  "published",
  taskflow_cx: {
    R_role:            "Test assistant",
    S_situation:       "Testing the runner.",
    T_task:            "Produce a summary and details.",
    W_watchouts:       "Do not hallucinate.",
    O_output_contract: "Two outputs: summary, details.",
  },
  input_contract: {
    fields: [
      { key: "topic", type: "text", label: "Topic" } as const,
    ],
    required_fields: ["topic"],
  },
  output_contract: {
    fields: [
      { key: "summary", type: "text", label: "Summary" } as const,
      { key: "details", type: "text", label: "Details"  } as const,
    ],
    required_fields: ["summary", "details"],
    public_fields:   ["summary"],
  },
  runtime_contract: {
    execution_type: "single_casepack",
    provider:       "mock",
    model:          "gpt-4o",
    repair_enabled: true,
    max_repair_attempts: 2,
  },
  ui_schema: {
    app_mode: "micro_app",
    public_mode: false,
    trust_badge: true,
  },
};

const VALID_OUTPUT = { summary: "Test summary", details: "Test details" };
const PARTIAL_OUTPUT = { summary: "Only summary" }; // missing details

// ── Mock factories ────────────────────────────────────────────────────────────

function createRunStore(): IRunStore & { rows: Record<string, Record<string, unknown>> } {
  const rows: Record<string, Record<string, unknown>> = {};
  let idCounter = 0;
  return {
    rows,
    create: vi.fn(async (params: Record<string, unknown>) => {
      const id = `run-${++idCounter}`;
      rows[id] = { ...params, status: "pending" };
      return id;
    }),
    update: vi.fn(async (runId: string, params: Record<string, unknown>) => {
      if (!rows[runId]) rows[runId] = {};
      Object.assign(rows[runId]!, params);
    }),
  };
}

function createTraceStore(): ITraceStore & { events: TraceRecord[] } {
  const events: TraceRecord[] = [];
  return {
    events,
    write: vi.fn(async (event: TraceRecord) => { events.push(event); }),
  };
}

function createUsageStore(): IUsageStore & { events: UsageRecord[] } {
  const events: UsageRecord[] = [];
  return {
    events,
    write: vi.fn(async (event: UsageRecord) => { events.push(event); }),
  };
}

function createContext(
  mockOutput: Record<string, unknown>,
  overrides?: Partial<RunContext>
): RunContext & {
  runStore: ReturnType<typeof createRunStore>;
  _traceStore: ReturnType<typeof createTraceStore>;
  _usageStore: ReturnType<typeof createUsageStore>;
} {
  const runStore   = createRunStore();
  const traceStore = createTraceStore();
  const usageStore = createUsageStore();

  const adapter = new MockAIProvider(
    { "casepack.test_runner.v1": mockOutput },
    0
  );

  return {
    workspace_id: "ws-test",
    casepack_key: "casepack.test_runner.v1",
    mao:          MAO,
    user_input:   { topic: "AI testing" },
    adapter,
    traceWriter:  new TraceWriter(traceStore),
    usageWriter:  new UsageWriter(usageStore),
    runStore,
    publicMode:   false,
    _traceStore:  traceStore,
    _usageStore:  usageStore,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("runSingleCasePack", () => {
  // ── Happy path ────────────────────────────────────────────────────────────

  it("returns status=success when output is valid", async () => {
    const ctx = createContext(VALID_OUTPUT);
    const result = await runSingleCasePack(ctx);
    expect(result.status).toBe("success");
    expect(result.output.summary).toBe("Test summary");
    expect(result.output.details).toBe("Test details");
  });

  it("returns a run_id", async () => {
    const ctx = createContext(VALID_OUTPUT);
    const result = await runSingleCasePack(ctx);
    expect(result.run_id).toMatch(/^run-/);
  });

  it("has repair_attempts=0 and fallback_used=false on success", async () => {
    const ctx = createContext(VALID_OUTPUT);
    const result = await runSingleCasePack(ctx);
    expect(result.repair_attempts).toBe(0);
    expect(result.fallback_used).toBe(false);
  });

  it("creates a run store row", async () => {
    const ctx = createContext(VALID_OUTPUT);
    await runSingleCasePack(ctx);
    expect(ctx.runStore.create).toHaveBeenCalledTimes(1);
  });

  it("updates run store with final status and output", async () => {
    const ctx = createContext(VALID_OUTPUT);
    const result = await runSingleCasePack(ctx);
    const row = ctx.runStore.rows[result.run_id];
    expect(row).toBeDefined();
    expect(row!.status).toBe("success");
    expect(row!.output_json).toEqual(VALID_OUTPUT);
  });

  // ── Trace events ──────────────────────────────────────────────────────────

  it("writes trace events (start, steps, output, complete)", async () => {
    const ctx = createContext(VALID_OUTPUT);
    await runSingleCasePack(ctx);
    const events = ctx._traceStore.events;
    expect(events.length).toBeGreaterThanOrEqual(4);
    expect(events[0]!.event_type).toBe("start");
    expect(events.some((e) => e.event_type === "output")).toBe(true);
    expect(events.some((e) => e.event_type === "complete")).toBe(true);
  });

  // ── Usage events ──────────────────────────────────────────────────────────

  it("writes a usage event with token counts", async () => {
    const ctx = createContext(VALID_OUTPUT);
    await runSingleCasePack(ctx);
    const usageEvents = ctx._usageStore.events;
    expect(usageEvents).toHaveLength(1);
    expect(usageEvents[0]!.tokens_in).toBeGreaterThan(0);
    expect(usageEvents[0]!.tokens_out).toBeGreaterThan(0);
  });

  // ── Input validation failure ──────────────────────────────────────────────

  it("throws VALIDATION_ERROR when required input field is missing", async () => {
    const ctx = createContext(VALID_OUTPUT, { user_input: {} });
    await expect(runSingleCasePack(ctx)).rejects.toBeInstanceOf(AppError);
    try {
      await runSingleCasePack(createContext(VALID_OUTPUT, { user_input: {} }));
    } catch (err) {
      expect((err as AppError).code).toBe("VALIDATION_ERROR");
    }
  });

  it("updates run row to failed when input validation fails", async () => {
    const ctx = createContext(VALID_OUTPUT, { user_input: {} });
    try { await runSingleCasePack(ctx); } catch { /* expected */ }
    const run = Object.values(ctx.runStore.rows)[0];
    expect(run?.status).toBe("failed");
  });

  // ── Repair flow ───────────────────────────────────────────────────────────

  it("returns status=repaired when output is initially invalid but repair succeeds", async () => {
    // First call returns partial, repair calls return valid
    let callCount = 0;
    const adapter = {
      provider: "mock" as const,
      call: vi.fn(async () => {
        callCount++;
        const output = callCount === 1 ? PARTIAL_OUTPUT : VALID_OUTPUT;
        return {
          raw_text:   JSON.stringify(output),
          tokens_in:  10,
          tokens_out: 20,
          model:      "gpt-4o",
          provider:   "mock",
          latency_ms: 0,
        };
      }),
    };
    const ctx = createContext(VALID_OUTPUT, { adapter });
    const result = await runSingleCasePack(ctx);
    expect(result.status).toBe("repaired");
    expect(result.repair_attempts).toBe(1);
  });

  // ── Fallback flow ─────────────────────────────────────────────────────────

  it("returns status=failed with fallback when repair exhausted", async () => {
    // All calls return partial output
    const adapter = {
      provider: "mock" as const,
      call: vi.fn(async () => ({
        raw_text:   JSON.stringify(PARTIAL_OUTPUT),
        tokens_in:  10,
        tokens_out: 20,
        model:      "gpt-4o",
        provider:   "mock",
        latency_ms: 0,
      })),
    };
    const ctx = createContext(VALID_OUTPUT, { adapter });
    const result = await runSingleCasePack(ctx);
    expect(result.status).toBe("failed");
    expect(result.fallback_used).toBe(true);
    expect(result.output.details).toBe(FALLBACK_PLACEHOLDER);
  });

  // ── Public mode ───────────────────────────────────────────────────────────

  it("sanitizes output when publicMode=true", async () => {
    const ctx = createContext(VALID_OUTPUT, { publicMode: true });
    const result = await runSingleCasePack(ctx);
    // public_fields only includes "summary", so "details" should be stripped
    expect(result.output).toHaveProperty("summary");
    expect(result.output).not.toHaveProperty("details");
  });

  it("preserves all fields when publicMode=false", async () => {
    const ctx = createContext(VALID_OUTPUT, { publicMode: false });
    const result = await runSingleCasePack(ctx);
    expect(result.output).toHaveProperty("summary");
    expect(result.output).toHaveProperty("details");
  });

  // ── Zero retention ────────────────────────────────────────────────────────

  it("does not write trace or usage events when zeroRetention=true", async () => {
    const ctx = createContext(VALID_OUTPUT, { zeroRetention: true });
    await runSingleCasePack(ctx);
    expect(ctx._traceStore.events).toHaveLength(0);
    expect(ctx._usageStore.events).toHaveLength(0);
  });

  // ── Validation report ─────────────────────────────────────────────────────

  it("returns a valid validation report", async () => {
    const ctx = createContext(VALID_OUTPUT);
    const result = await runSingleCasePack(ctx);
    expect(result.validation.valid).toBe(true);
    expect(result.validation.status).toBe("pass");
  });
});
