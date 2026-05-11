/**
 * tests/unit/runtime/execution-plan.test.ts
 *
 * Unit tests for ExecutionPlanBuilder.buildExecutionPlan().
 */

import { describe, it, expect } from "vitest";
import { buildExecutionPlan } from "@cognitive-forge/runtime";
import type { CasePackMAO } from "@cognitive-forge/core";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SAMPLE_MAO: CasePackMAO = {
  key:     "casepack.prompt_improvement_practice.v1",
  version: "1.0.0",
  status:  "published",
  taskflow_cx: {
    R_role:            "Expert AI prompt engineer and learning coach",
    S_situation:       "A learner has written a prompt they want to improve.",
    T_task:            "Analyse the learner's prompt, diagnose weaknesses, and produce an improved version.",
    K_REF:             "Good prompts include: Role, Audience, Task, Format, Constraints.",
    W_watchouts:       "Do not simply rewrite without explaining reasoning.",
    F_flow:            "1. Diagnose. 2. Rewrite. 3. Explain.",
    L_language:        "Professional but accessible. Beginner-friendly explanations.",
    O_output_contract: "Three outputs: diagnosis, improved_prompt, improvement_explanation.",
  },
  input_contract: {
    fields: [
      { key: "original_prompt", type: "text",   label: "Original Prompt" } as const,
      { key: "learner_level",   type: "select", label: "Level", options: ["beginner", "intermediate", "advanced"] } as const,
    ],
    required_fields: ["original_prompt"],
  },
  output_contract: {
    fields: [
      { key: "diagnosis",               type: "text", label: "Diagnosis"        } as const,
      { key: "improved_prompt",         type: "text", label: "Improved Prompt"  } as const,
      { key: "improvement_explanation", type: "text", label: "Explanation"      } as const,
    ],
    required_fields: ["diagnosis", "improved_prompt", "improvement_explanation"],
    public_fields:   ["diagnosis", "improved_prompt", "improvement_explanation"],
  },
  runtime_contract: {
    execution_type:      "single_casepack",
    provider:            "openai",
    model:               "gpt-4o",
    temperature:         0.7,
    repair_enabled:      true,
    max_repair_attempts: 2,
  },
  ui_schema: {
    app_mode:    "micro_app",
    public_mode: false,
    trust_badge: true,
  },
};

const USER_INPUT = {
  original_prompt: "Tell me about AI",
  learner_level:   "beginner",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("buildExecutionPlan", () => {
  it("returns an ExecutionPlan with the correct run_id", () => {
    const plan = buildExecutionPlan("test-run-id-1", SAMPLE_MAO, USER_INPUT);
    expect(plan.run_id).toBe("test-run-id-1");
  });

  it("copies casepack_key from MAO", () => {
    const plan = buildExecutionPlan("run-1", SAMPLE_MAO, USER_INPUT);
    expect(plan.casepack_key).toBe("casepack.prompt_improvement_practice.v1");
  });

  it("extracts provider from runtime_contract", () => {
    const plan = buildExecutionPlan("run-1", SAMPLE_MAO, USER_INPUT);
    expect(plan.provider).toBe("openai");
  });

  it("extracts model from runtime_contract", () => {
    const plan = buildExecutionPlan("run-1", SAMPLE_MAO, USER_INPUT);
    expect(plan.model).toBe("gpt-4o");
  });

  it("extracts temperature from runtime_contract", () => {
    const plan = buildExecutionPlan("run-1", SAMPLE_MAO, USER_INPUT);
    expect(plan.temperature).toBe(0.7);
  });

  it("extracts repair_enabled and max_repair_attempts", () => {
    const plan = buildExecutionPlan("run-1", SAMPLE_MAO, USER_INPUT);
    expect(plan.repair_enabled).toBe(true);
    expect(plan.max_repair_attempts).toBe(2);
  });

  it("defaults repair_enabled=true when not in runtime_contract", () => {
    const maoNoRepair: CasePackMAO = {
      ...SAMPLE_MAO,
      runtime_contract: {
        execution_type: "single_casepack",
        provider:       "openai",
        model:          "gpt-4o",
        // repair_enabled has default(true) in schema, so will be true
      },
    };
    const plan = buildExecutionPlan("run-1", maoNoRepair, USER_INPUT);
    expect(plan.repair_enabled).toBe(true);
  });

  it("includes created_at as ISO 8601 timestamp", () => {
    const plan = buildExecutionPlan("run-1", SAMPLE_MAO, USER_INPUT);
    expect(plan.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  // Prompt content tests
  it("prompt includes R_role section", () => {
    const plan = buildExecutionPlan("run-1", SAMPLE_MAO, USER_INPUT);
    expect(plan.prompt).toContain("ROLE");
    expect(plan.prompt).toContain("Expert AI prompt engineer");
  });

  it("prompt includes T_task section", () => {
    const plan = buildExecutionPlan("run-1", SAMPLE_MAO, USER_INPUT);
    expect(plan.prompt).toContain("TASK");
    expect(plan.prompt).toContain("Analyse the learner");
  });

  it("prompt includes W_watchouts section", () => {
    const plan = buildExecutionPlan("run-1", SAMPLE_MAO, USER_INPUT);
    expect(plan.prompt).toContain("WATCHOUTS");
    expect(plan.prompt).toContain("Do not simply rewrite");
  });

  it("prompt includes F_flow section", () => {
    const plan = buildExecutionPlan("run-1", SAMPLE_MAO, USER_INPUT);
    expect(plan.prompt).toContain("FLOW");
    expect(plan.prompt).toContain("Diagnose");
  });

  it("prompt includes O_output_contract summary", () => {
    const plan = buildExecutionPlan("run-1", SAMPLE_MAO, USER_INPUT);
    expect(plan.prompt).toContain("OUTPUT CONTRACT");
    expect(plan.prompt).toContain("Three outputs");
  });

  it("prompt includes K_REF section", () => {
    const plan = buildExecutionPlan("run-1", SAMPLE_MAO, USER_INPUT);
    expect(plan.prompt).toContain("REFERENCE KNOWLEDGE");
    expect(plan.prompt).toContain("Good prompts include");
  });

  it("prompt injects user input as K_IN section", () => {
    const plan = buildExecutionPlan("run-1", SAMPLE_MAO, USER_INPUT);
    expect(plan.prompt).toContain("USER INPUT");
    expect(plan.prompt).toContain("original_prompt");
    expect(plan.prompt).toContain("Tell me about AI");
  });

  it("prompt includes output field list with required fields", () => {
    const plan = buildExecutionPlan("run-1", SAMPLE_MAO, USER_INPUT);
    expect(plan.prompt).toContain("OUTPUT FORMAT");
    expect(plan.prompt).toContain("diagnosis");
    expect(plan.prompt).toContain("improved_prompt");
    expect(plan.prompt).toContain("Required fields");
  });

  it("prompt is a non-empty string", () => {
    const plan = buildExecutionPlan("run-1", SAMPLE_MAO, USER_INPUT);
    expect(typeof plan.prompt).toBe("string");
    expect(plan.prompt.length).toBeGreaterThan(100);
  });
});
