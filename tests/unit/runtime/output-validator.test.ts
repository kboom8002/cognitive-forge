/**
 * tests/unit/runtime/output-validator.test.ts
 *
 * Unit tests for OutputContractValidator.validateOutput().
 */

import { describe, it, expect } from "vitest";
import { validateOutput } from "@cognitive-forge/runtime";
import type { OutputContract } from "@cognitive-forge/core";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PROMPT_IMPROVEMENT_CONTRACT: OutputContract = {
  fields: [
    { key: "diagnosis",               type: "text", label: "Prompt Diagnosis"         } as const,
    { key: "improved_prompt",         type: "text", label: "Improved Prompt"          } as const,
    { key: "improvement_explanation", type: "text", label: "Improvement Explanation"  } as const,
  ],
  required_fields: ["diagnosis", "improved_prompt", "improvement_explanation"],
  public_fields:   ["diagnosis", "improved_prompt", "improvement_explanation"],
};

const PARTIAL_CONTRACT: OutputContract = {
  fields: [
    { key: "summary",  type: "text", label: "Summary"  } as const,
    { key: "optional", type: "text", label: "Optional" } as const,
  ],
  required_fields: ["summary"],
};

const VALID_OUTPUT = {
  diagnosis:               "Missing role and audience",
  improved_prompt:         "You are a science writer...",
  improvement_explanation: "Added role and structure.",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("validateOutput", () => {
  // Happy path
  it("returns status=pass when all required output fields are present", () => {
    const report = validateOutput(VALID_OUTPUT, PROMPT_IMPROVEMENT_CONTRACT);
    expect(report.status).toBe("pass");
    expect(report.valid).toBe(true);
    expect(report.errors).toHaveLength(0);
  });

  it("returns a valid ValidationReport with checked_at timestamp", () => {
    const report = validateOutput(VALID_OUTPUT, PROMPT_IMPROVEMENT_CONTRACT);
    expect(report.checked_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  // Missing required output fields
  it("returns status=fail when a required output field is missing", () => {
    const output = { diagnosis: "Some diagnosis" }; // missing improved_prompt and improvement_explanation
    const report = validateOutput(output, PROMPT_IMPROVEMENT_CONTRACT);
    expect(report.status).toBe("fail");
    expect(report.valid).toBe(false);
  });

  it("error code is MISSING_REQUIRED_OUTPUT_FIELD for missing field", () => {
    const output = { diagnosis: "diagnosis only" };
    const report = validateOutput(output, PROMPT_IMPROVEMENT_CONTRACT);
    expect(report.errors.some((e) => e.code === "MISSING_REQUIRED_OUTPUT_FIELD")).toBe(true);
  });

  it("blocking is true for missing required output field", () => {
    const output = { diagnosis: "diagnosis only" };
    const report = validateOutput(output, PROMPT_IMPROVEMENT_CONTRACT);
    const err = report.errors.find((e) => e.code === "MISSING_REQUIRED_OUTPUT_FIELD");
    expect(err?.blocking).toBe(true);
  });

  it("returns fail when required output field is an empty string", () => {
    const output = { ...VALID_OUTPUT, diagnosis: "" };
    const report = validateOutput(output, PROMPT_IMPROVEMENT_CONTRACT);
    expect(report.status).toBe("fail");
  });

  it("returns all missing field errors when multiple required fields absent", () => {
    const report = validateOutput({}, PROMPT_IMPROVEMENT_CONTRACT);
    const missingErrors = report.errors.filter((e) => e.code === "MISSING_REQUIRED_OUTPUT_FIELD");
    expect(missingErrors.length).toBe(3);
  });

  // Optional fields
  it("passes when optional field is absent from output", () => {
    const report = validateOutput({ summary: "Hello" }, PARTIAL_CONTRACT);
    expect(report.valid).toBe(true);
  });

  // Extra fields
  it("warns about extra fields not in contract (non-blocking)", () => {
    const output = { ...VALID_OUTPUT, _internal_field: "secret" };
    const report = validateOutput(output, PROMPT_IMPROVEMENT_CONTRACT);
    expect(report.valid).toBe(true);
    expect(report.warnings?.some((w) => w.includes("_internal_field"))).toBe(true);
  });

  // Type checks
  it("returns type mismatch error for non-string text field", () => {
    const output = { ...VALID_OUTPUT, diagnosis: 42 };
    const report = validateOutput(output, PROMPT_IMPROVEMENT_CONTRACT);
    expect(report.errors.some((e) => e.code === "OUTPUT_TYPE_MISMATCH")).toBe(true);
  });

  it("type mismatch for required text field is blocking", () => {
    const output = { ...VALID_OUTPUT, diagnosis: 42 };
    const report = validateOutput(output, PROMPT_IMPROVEMENT_CONTRACT);
    const err = report.errors.find((e) => e.code === "OUTPUT_TYPE_MISMATCH");
    expect(err?.blocking).toBe(true);
  });

  // Edge cases
  it("handles empty output gracefully", () => {
    const report = validateOutput({}, PROMPT_IMPROVEMENT_CONTRACT);
    expect(report.status).toBe("fail");
    expect(report.valid).toBe(false);
  });
});
