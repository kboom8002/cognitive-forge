/**
 * tests/integration/runtime-run.test.ts
 *
 * Integration test: runs a real P0 fixture (prompt-improvement-practice)
 * through SingleCasePackRunner with MockAIProvider and in-memory stores.
 *
 * Validates the full pipeline: input validation → plan → AI call →
 * output validation → trace/usage → public sanitization.
 */

import { describe, it, expect, vi } from "vitest";
import {
  runSingleCasePack,
  MockAIProvider,
  TraceWriter,
  UsageWriter,
  MOCK_OUTPUT_MAP,
} from "@cognitive-forge/runtime";
import type {
  IRunStore,
  ITraceStore,
  IUsageStore,
  TraceRecord,
  UsageRecord,
} from "@cognitive-forge/runtime";
import type { CasePackMAO } from "@cognitive-forge/core";
import { AppError, CasePackMAOSchema } from "@cognitive-forge/core";

// ── Load P0 fixture ───────────────────────────────────────────────────────────

// Inline the minimal P0 MAO (same structure as docs/fixtures/casepacks/ai-training/cp.prompt.improvement.practice.v1.json)
const P0_MAO_RAW = {
  key:     "casepack.prompt_improvement_practice.v1",
  version: "1.0.0",
  status:  "published",
  taskflow_cx: {
    R_role:            "Expert AI prompt engineer and learning coach specialising in systematic prompt improvement and learner skill development",
    S_situation:       "A learner has written a prompt they want to improve.",
    T_task:            "Analyse the learner's original prompt, diagnose its specific weaknesses, produce an improved version, and explain the improvement.",
    W_watchouts:       "Do not simply rewrite the prompt without explaining the reasoning.",
    O_output_contract: "Three outputs: diagnosis, improved_prompt, improvement_explanation.",
  },
  input_contract: {
    fields: [
      { key: "original_prompt", type: "text",   label: "Your Original Prompt",    placeholder: "Paste the prompt you want to improve..." },
      { key: "task_context",    type: "text",   label: "Task Context (optional)", placeholder: "What is this prompt trying to accomplish?" },
      { key: "learner_level",   type: "select", label: "Your Experience Level",   options: ["beginner", "intermediate", "advanced"], default_value: "beginner" },
    ],
    required_fields: ["original_prompt"],
  },
  output_contract: {
    fields: [
      { key: "diagnosis",               type: "text", label: "Prompt Diagnosis"        },
      { key: "improved_prompt",         type: "text", label: "Improved Prompt"         },
      { key: "improvement_explanation", type: "text", label: "Improvement Explanation" },
    ],
    required_fields: ["diagnosis", "improved_prompt", "improvement_explanation"],
    public_fields:   ["diagnosis", "improved_prompt", "improvement_explanation"],
  },
  runtime_contract: { execution_type: "single_casepack", provider: "openai", model: "gpt-4o" },
  ui_schema: {
    app_mode:     "micro_app",
    layout:       "single_column",
    public_mode:  false,
    trust_badge:  true,
    submit_label: "Improve My Prompt",
  },
  metadata: {
    title:       "Prompt Improvement Practice",
    description: "Diagnoses a learner's prompt, produces an improved version, and explains the changes.",
  },
};

// ── Mock stores ───────────────────────────────────────────────────────────────

function createRunStore(): IRunStore & { rows: Record<string, Record<string, unknown>> } {
  const rows: Record<string, Record<string, unknown>> = {};
  let idCounter = 0;
  return {
    rows,
    create: vi.fn(async (params: Record<string, unknown>) => {
      const id = `integ-run-${++idCounter}`;
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
  return { events, write: vi.fn(async (e: TraceRecord) => { events.push(e); }) };
}

function createUsageStore(): IUsageStore & { events: UsageRecord[] } {
  const events: UsageRecord[] = [];
  return { events, write: vi.fn(async (e: UsageRecord) => { events.push(e); }) };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Integration: runtime-run (P0 prompt-improvement-practice)", () => {
  it("P0 fixture validates against CasePackMAOSchema", () => {
    const result = CasePackMAOSchema.safeParse(P0_MAO_RAW);
    expect(result.success).toBe(true);
  });

  it("mock-output-map has an entry for the P0 casepack", () => {
    const entry = MOCK_OUTPUT_MAP["casepack.prompt_improvement_practice.v1"];
    expect(entry).toBeDefined();
    expect(entry).toHaveProperty("diagnosis");
    expect(entry).toHaveProperty("improved_prompt");
    expect(entry).toHaveProperty("improvement_explanation");
  });

  it("runs end-to-end with P0 input and returns success", async () => {
    const mao = CasePackMAOSchema.parse(P0_MAO_RAW) as CasePackMAO;
    const runStore   = createRunStore();
    const traceStore = createTraceStore();
    const usageStore = createUsageStore();

    const adapter = new MockAIProvider(MOCK_OUTPUT_MAP, 0);

    const result = await runSingleCasePack({
      workspace_id: "integ-ws",
      casepack_key: mao.key,
      mao,
      user_input: {
        original_prompt: "Tell me about AI",
        task_context:    "Blog post for beginners",
        learner_level:   "beginner",
      },
      adapter,
      traceWriter:  new TraceWriter(traceStore),
      usageWriter:  new UsageWriter(usageStore),
      runStore,
      publicMode:   false,
    });

    // Status
    expect(result.status).toBe("success");
    expect(result.repair_attempts).toBe(0);
    expect(result.fallback_used).toBe(false);

    // Output has all required fields
    expect(result.output).toHaveProperty("diagnosis");
    expect(result.output).toHaveProperty("improved_prompt");
    expect(result.output).toHaveProperty("improvement_explanation");
    expect(typeof result.output.diagnosis).toBe("string");

    // Validation report is pass
    expect(result.validation.valid).toBe(true);
    expect(result.validation.status).toBe("pass");
  });

  it("public mode strips non-public fields from output", async () => {
    const maoWithInternal: CasePackMAO = {
      ...CasePackMAOSchema.parse(P0_MAO_RAW) as CasePackMAO,
      output_contract: {
        fields: [
          { key: "diagnosis",               type: "text" as const, label: "Diagnosis"   },
          { key: "improved_prompt",         type: "text" as const, label: "Improved"    },
          { key: "improvement_explanation", type: "text" as const, label: "Explanation" },
          { key: "internal_debug",          type: "text" as const, label: "Debug"       },
        ],
        required_fields: ["diagnosis", "improved_prompt", "improvement_explanation"],
        public_fields:   ["diagnosis", "improved_prompt", "improvement_explanation"],
      },
    };

    // Add internal_debug to mock output
    const mockMap = {
      ...MOCK_OUTPUT_MAP,
      [maoWithInternal.key]: {
        ...MOCK_OUTPUT_MAP[maoWithInternal.key],
        internal_debug: "secret internal data",
      },
    };

    const adapter  = new MockAIProvider(mockMap as Record<string, Record<string, unknown>>, 0);
    const runStore = createRunStore();

    const result = await runSingleCasePack({
      workspace_id: "integ-ws",
      casepack_key: maoWithInternal.key,
      mao: maoWithInternal,
      user_input:   { original_prompt: "Test" },
      adapter,
      traceWriter:  new TraceWriter(createTraceStore()),
      usageWriter:  new UsageWriter(createUsageStore()),
      runStore,
      publicMode:   true,
    });

    expect(result.output).toHaveProperty("diagnosis");
    expect(result.output).not.toHaveProperty("internal_debug");
  });

  it("writes trace events covering the full lifecycle", async () => {
    const mao = CasePackMAOSchema.parse(P0_MAO_RAW) as CasePackMAO;
    const traceStore = createTraceStore();

    await runSingleCasePack({
      workspace_id: "integ-ws",
      casepack_key: mao.key,
      mao,
      user_input:   { original_prompt: "Test prompt" },
      adapter:      new MockAIProvider(MOCK_OUTPUT_MAP, 0),
      traceWriter:  new TraceWriter(traceStore),
      usageWriter:  new UsageWriter(createUsageStore()),
      runStore:     createRunStore(),
      publicMode:   false,
    });

    const types = traceStore.events.map((e) => e.event_type);
    expect(types[0]).toBe("start");
    expect(types).toContain("step");
    expect(types).toContain("output");
    expect(types).toContain("complete");
    // Sequences must be strictly increasing
    for (let i = 1; i < traceStore.events.length; i++) {
      expect(traceStore.events[i]!.sequence).toBeGreaterThan(traceStore.events[i - 1]!.sequence);
    }
  });

  it("writes a usage event with token counts and provider info", async () => {
    const mao = CasePackMAOSchema.parse(P0_MAO_RAW) as CasePackMAO;
    const usageStore = createUsageStore();

    await runSingleCasePack({
      workspace_id: "integ-ws",
      casepack_key: mao.key,
      mao,
      user_input:   { original_prompt: "Test" },
      adapter:      new MockAIProvider(MOCK_OUTPUT_MAP, 0),
      traceWriter:  new TraceWriter(createTraceStore()),
      usageWriter:  new UsageWriter(usageStore),
      runStore:     createRunStore(),
      publicMode:   false,
    });

    expect(usageStore.events).toHaveLength(1);
    const usage = usageStore.events[0]!;
    expect(usage.tokens_in).toBeGreaterThan(0);
    expect(usage.tokens_out).toBeGreaterThan(0);
    expect(usage.provider).toBe("openai"); // from runtime_contract, not adapter identity
    expect(usage.casepack_key).toBe("casepack.prompt_improvement_practice.v1");
    expect(usage.workspace_id).toBe("integ-ws");
  });

  it("rejects run with missing required input", async () => {
    const mao = CasePackMAOSchema.parse(P0_MAO_RAW) as CasePackMAO;

    await expect(
      runSingleCasePack({
        workspace_id: "integ-ws",
        casepack_key: mao.key,
        mao,
        user_input:   {}, // missing original_prompt
        adapter:      new MockAIProvider(MOCK_OUTPUT_MAP, 0),
        traceWriter:  new TraceWriter(createTraceStore()),
        usageWriter:  new UsageWriter(createUsageStore()),
        runStore:     createRunStore(),
        publicMode:   false,
      })
    ).rejects.toThrow(AppError);
  });
});
