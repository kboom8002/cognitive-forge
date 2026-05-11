/**
 * Phase B tests — leaf schemas.
 *
 * Covers:
 * - FieldDefSchema (shared field definition)
 * - TaskflowCXSchema (required W_watchouts, O_output_contract)
 * - InputContractSchema (required_fields cross-reference)
 * - OutputContractSchema (required_fields + public_fields cross-reference)
 * - RuntimeContractSchema (discriminated union: single/bridge/graph)
 * - UISchemaSchema (micro_app / composite_app modes)
 */

import { describe, it, expect } from "vitest";

import {
  FieldDefSchema,
  TaskflowCXSchema,
  InputContractSchema,
  OutputContractSchema,
  RuntimeContractSchema,
  UISchemaSchema,
  APP_MODE,
} from "@cognitive-forge/core";

// ── Shared valid fixtures ────────────────────────────────────────────────────

const VALID_STRING_FIELD = {
  key: "company_name",
  type: "string",
  label: "Company Name",
  description: "The full legal company name",
};

const VALID_SELECT_FIELD = {
  key: "industry",
  type: "select",
  label: "Industry",
  options: ["Tech", "Finance", "Healthcare"],
};

const VALID_TASKFLOW = {
  R_role: "You are a senior corporate communications strategist.",
  S_situation: "A company needs to respond to a public crisis about a product defect.",
  T_task: "Draft a concise, empathetic public statement addressing the issue.",
  K_REF: "Brand guidelines: formal tone, avoid passive voice.",
  W_watchouts:
    "Do not admit legal liability. Do not speculate on root cause. Do not use jargon.",
  O_output_contract:
    "A single statement of 150-200 words, professional tone, no bullet points.",
};

// ── FieldDefSchema ────────────────────────────────────────────────────────────

describe("FieldDefSchema", () => {
  it("accepts a valid string field", () => {
    expect(FieldDefSchema.safeParse(VALID_STRING_FIELD).success).toBe(true);
  });

  it("accepts a valid select field with options", () => {
    expect(FieldDefSchema.safeParse(VALID_SELECT_FIELD).success).toBe(true);
  });

  it("rejects a select field with no options", () => {
    const result = FieldDefSchema.safeParse({
      key: "status",
      type: "select",
      label: "Status",
      // options intentionally omitted
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("options");
    }
  });

  it("rejects non-snake_case field key", () => {
    expect(
      FieldDefSchema.safeParse({ key: "Company Name", type: "string", label: "Name" }).success
    ).toBe(false);
  });

  it("rejects CamelCase key", () => {
    expect(
      FieldDefSchema.safeParse({ key: "companyName", type: "string", label: "Name" }).success
    ).toBe(false);
  });

  it("rejects unknown field type", () => {
    expect(
      FieldDefSchema.safeParse({ key: "foo", type: "richtext", label: "Foo" }).success
    ).toBe(false);
  });

  it("rejects missing label", () => {
    expect(
      FieldDefSchema.safeParse({ key: "foo", type: "string" }).success
    ).toBe(false);
  });
});

// ── TaskflowCXSchema ──────────────────────────────────────────────────────────

describe("TaskflowCXSchema", () => {
  it("accepts a valid TaskflowCX", () => {
    expect(TaskflowCXSchema.safeParse(VALID_TASKFLOW).success).toBe(true);
  });

  it("accepts TaskflowCX with optional fields", () => {
    const full = {
      ...VALID_TASKFLOW,
      K_IN: "User provided: company = Acme Corp",
      K_EX: "Example: 'We sincerely apologise for...'",
      F_flow: "1. Acknowledge. 2. Explain. 3. Action. 4. Commitment.",
      L_language: "Formal British English, third-person perspective.",
    };
    expect(TaskflowCXSchema.safeParse(full).success).toBe(true);
  });

  it("REJECTS — missing W_watchouts", () => {
    const { W_watchouts: _, ...noWatchouts } = VALID_TASKFLOW;
    const result = TaskflowCXSchema.safeParse(noWatchouts);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("W_watchouts");
    }
  });

  it("REJECTS — empty W_watchouts string", () => {
    const result = TaskflowCXSchema.safeParse({ ...VALID_TASKFLOW, W_watchouts: "" });
    expect(result.success).toBe(false);
  });

  it("REJECTS — missing O_output_contract", () => {
    const { O_output_contract: _, ...noOutput } = VALID_TASKFLOW;
    const result = TaskflowCXSchema.safeParse(noOutput);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("O_output_contract");
    }
  });

  it("REJECTS — empty O_output_contract string", () => {
    const result = TaskflowCXSchema.safeParse({ ...VALID_TASKFLOW, O_output_contract: "" });
    expect(result.success).toBe(false);
  });

  it("REJECTS — missing R_role", () => {
    const { R_role: _, ...noRole } = VALID_TASKFLOW;
    const result = TaskflowCXSchema.safeParse(noRole);
    expect(result.success).toBe(false);
  });
});

// ── InputContractSchema ───────────────────────────────────────────────────────

describe("InputContractSchema", () => {
  const validInput = {
    fields: [VALID_STRING_FIELD, { key: "tone", type: "select", label: "Tone", options: ["Formal", "Casual"] }],
    required_fields: ["company_name"],
  };

  it("accepts a valid InputContract", () => {
    expect(InputContractSchema.safeParse(validInput).success).toBe(true);
  });

  it("accepts empty required_fields", () => {
    expect(InputContractSchema.safeParse({ ...validInput, required_fields: [] }).success).toBe(true);
  });

  it("REJECTS — required_field references unknown key", () => {
    const result = InputContractSchema.safeParse({
      ...validInput,
      required_fields: ["company_name", "unknown_key"],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues[0].message;
      expect(msg).toContain("unknown_key");
    }
  });

  it("REJECTS — empty fields array", () => {
    expect(InputContractSchema.safeParse({ fields: [], required_fields: [] }).success).toBe(false);
  });
});

// ── OutputContractSchema ──────────────────────────────────────────────────────

describe("OutputContractSchema", () => {
  const validOutput = {
    fields: [
      { key: "statement", type: "text", label: "Public Statement" },
      { key: "word_count", type: "number", label: "Word Count" },
    ],
    required_fields: ["statement"],
    public_fields: ["statement"],
  };

  it("accepts a valid OutputContract", () => {
    expect(OutputContractSchema.safeParse(validOutput).success).toBe(true);
  });

  it("REJECTS — required_fields references unknown key (cross-ref rule, doc 05)", () => {
    const result = OutputContractSchema.safeParse({
      ...validOutput,
      required_fields: ["statement", "nonexistent_field"],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues[0].message;
      expect(msg).toContain("nonexistent_field");
    }
  });

  it("REJECTS — public_fields references unknown key", () => {
    const result = OutputContractSchema.safeParse({
      ...validOutput,
      public_fields: ["statement", "ghost_field"],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues[0].message;
      expect(msg).toContain("ghost_field");
    }
  });

  it("REJECTS — empty fields array", () => {
    expect(OutputContractSchema.safeParse({ fields: [], required_fields: [] }).success).toBe(false);
  });

  it("accepts output with no public_fields defined", () => {
    const { public_fields: _, ...noPublic } = validOutput;
    expect(OutputContractSchema.safeParse(noPublic).success).toBe(true);
  });
});

// ── RuntimeContractSchema ─────────────────────────────────────────────────────

describe("RuntimeContractSchema", () => {
  const baseFields = {
    provider: "openai",
    model: "gpt-4o",
    temperature: 0.3,
    max_tokens: 1024,
  };

  it("accepts single_casepack execution type", () => {
    const result = RuntimeContractSchema.safeParse({
      execution_type: "single_casepack",
      ...baseFields,
    });
    expect(result.success).toBe(true);
  });

  it("accepts bridge_casepack with valid bridge_key", () => {
    const result = RuntimeContractSchema.safeParse({
      execution_type: "bridge_casepack",
      ...baseFields,
      bridge_key: "bridge.pr_to_release.v1",
    });
    expect(result.success).toBe(true);
  });

  it("accepts sequential_graph with valid graph_key", () => {
    const result = RuntimeContractSchema.safeParse({
      execution_type: "sequential_graph",
      ...baseFields,
      graph_key: "graph.corporate_pr_suite.v1",
    });
    expect(result.success).toBe(true);
  });

  it("REJECTS — bridge_casepack missing bridge_key", () => {
    const result = RuntimeContractSchema.safeParse({
      execution_type: "bridge_casepack",
      ...baseFields,
      // bridge_key omitted
    });
    expect(result.success).toBe(false);
  });

  it("REJECTS — bridge_casepack with malformed bridge_key", () => {
    const result = RuntimeContractSchema.safeParse({
      execution_type: "bridge_casepack",
      ...baseFields,
      bridge_key: "casepack.foo.v1", // wrong prefix
    });
    expect(result.success).toBe(false);
  });

  it("REJECTS — sequential_graph missing graph_key", () => {
    const result = RuntimeContractSchema.safeParse({
      execution_type: "sequential_graph",
      ...baseFields,
    });
    expect(result.success).toBe(false);
  });

  it("REJECTS — unknown execution_type", () => {
    const result = RuntimeContractSchema.safeParse({
      execution_type: "parallel_casepack",
      ...baseFields,
    });
    expect(result.success).toBe(false);
  });

  it("REJECTS — temperature out of range", () => {
    const result = RuntimeContractSchema.safeParse({
      execution_type: "single_casepack",
      ...baseFields,
      temperature: 2.5,
    });
    expect(result.success).toBe(false);
  });

  it("REJECTS — unknown AI provider", () => {
    const result = RuntimeContractSchema.safeParse({
      execution_type: "single_casepack",
      ...baseFields,
      provider: "cohere",
    });
    expect(result.success).toBe(false);
  });

  it("defaults repair_enabled to true", () => {
    const result = RuntimeContractSchema.safeParse({
      execution_type: "single_casepack",
      ...baseFields,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.repair_enabled).toBe(true);
    }
  });
});

// ── UISchemaSchema ────────────────────────────────────────────────────────────

describe("UISchemaSchema", () => {
  it("accepts micro_app with defaults", () => {
    const result = UISchemaSchema.safeParse({ app_mode: "micro_app" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.public_mode).toBe(false);
      expect(result.data.trust_badge).toBe(true);
    }
  });

  it("accepts composite_app with wizard layout", () => {
    const result = UISchemaSchema.safeParse({
      app_mode: "composite_app",
      layout: "wizard",
    });
    expect(result.success).toBe(true);
  });

  it("accepts composite_app with tabbed layout", () => {
    expect(
      UISchemaSchema.safeParse({ app_mode: "composite_app", layout: "tabbed" }).success
    ).toBe(true);
  });

  it("accepts micro_app with field_overrides", () => {
    const result = UISchemaSchema.safeParse({
      app_mode: "micro_app",
      field_overrides: {
        company_name: { label: "Organisation Name", width: "full" },
        industry: { hidden: true },
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts public_mode: true", () => {
    const result = UISchemaSchema.safeParse({
      app_mode: "micro_app",
      public_mode: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.public_mode).toBe(true);
    }
  });

  it("REJECTS — missing app_mode", () => {
    const result = UISchemaSchema.safeParse({ layout: "single_column" });
    expect(result.success).toBe(false);
  });

  it("REJECTS — unknown app_mode", () => {
    const result = UISchemaSchema.safeParse({ app_mode: "fullscreen_app" });
    expect(result.success).toBe(false);
  });

  it("REJECTS — unknown layout", () => {
    const result = UISchemaSchema.safeParse({ app_mode: "micro_app", layout: "grid" });
    expect(result.success).toBe(false);
  });

  it("REJECTS — field_override with unknown width", () => {
    const result = UISchemaSchema.safeParse({
      app_mode: "micro_app",
      field_overrides: {
        name: { width: "quarter" }, // not in enum
      },
    });
    expect(result.success).toBe(false);
  });

  it("composite_app + single_column triggers superRefine issue", () => {
    // This is a warning-level validation — results in success:false due to addIssue
    const result = UISchemaSchema.safeParse({
      app_mode: "composite_app",
      layout: "single_column",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("composite_app");
    }
  });

  it("APP_MODE constants match schema enum values", () => {
    expect(APP_MODE.MICRO_APP).toBe("micro_app");
    expect(APP_MODE.COMPOSITE_APP).toBe("composite_app");
  });
});
