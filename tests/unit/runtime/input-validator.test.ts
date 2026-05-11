/**
 * tests/unit/runtime/input-validator.test.ts
 *
 * Unit tests for InputContractValidator.validateInput().
 */

import { describe, it, expect } from "vitest";
import { validateInput } from "@cognitive-forge/runtime";
import type { InputContract } from "@cognitive-forge/core";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SIMPLE_CONTRACT: InputContract = {
  fields: [
    { key: "original_prompt", type: "text",   label: "Original Prompt", required: true } as const,
    { key: "task_context",    type: "text",   label: "Task Context"    } as const,
    { key: "learner_level",   type: "select", label: "Level", options: ["beginner", "intermediate", "advanced"] } as const,
  ],
  required_fields: ["original_prompt"],
};

const MULTI_REQUIRED_CONTRACT: InputContract = {
  fields: [
    { key: "name",  type: "string", label: "Name"  } as const,
    { key: "email", type: "email",  label: "Email" } as const,
    { key: "age",   type: "number", label: "Age"   } as const,
    { key: "agree", type: "boolean", label: "Agree" } as const,
  ],
  required_fields: ["name", "email", "age"],
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("validateInput", () => {
  // Happy path
  it("returns status=pass when all required fields are present", () => {
    const report = validateInput(
      { original_prompt: "Tell me about AI" },
      SIMPLE_CONTRACT
    );
    expect(report.status).toBe("pass");
    expect(report.valid).toBe(true);
    expect(report.errors).toHaveLength(0);
  });

  it("returns a valid ValidationReport with checked_at ISO timestamp", () => {
    const report = validateInput({ original_prompt: "hello" }, SIMPLE_CONTRACT);
    expect(report.checked_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  // Missing required fields
  it("returns status=fail when required field is missing", () => {
    const report = validateInput({}, SIMPLE_CONTRACT);
    expect(report.status).toBe("fail");
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.code === "MISSING_REQUIRED_FIELD")).toBe(true);
  });

  it("returns status=fail when required field is an empty string", () => {
    const report = validateInput({ original_prompt: "" }, SIMPLE_CONTRACT);
    expect(report.status).toBe("fail");
    expect(report.errors.some((e) => e.code === "MISSING_REQUIRED_FIELD")).toBe(true);
  });

  it("returns status=fail when required field is whitespace only", () => {
    const report = validateInput({ original_prompt: "   " }, SIMPLE_CONTRACT);
    expect(report.status).toBe("fail");
    expect(report.errors.some((e) => e.code === "MISSING_REQUIRED_FIELD")).toBe(true);
  });

  it("errors include path pointing to the missing field", () => {
    const report = validateInput({}, SIMPLE_CONTRACT);
    const err = report.errors.find((e) => e.code === "MISSING_REQUIRED_FIELD");
    expect(err?.path).toContain("original_prompt");
  });

  it("all missing required fields appear as separate errors", () => {
    const report = validateInput({}, MULTI_REQUIRED_CONTRACT);
    const missingCodes = report.errors.filter((e) => e.code === "MISSING_REQUIRED_FIELD");
    expect(missingCodes.length).toBe(3); // name, email, age
  });

  // Type mismatch
  it("returns fail when number field receives a non-numeric string", () => {
    const report = validateInput(
      { name: "Alice", email: "a@b.com", age: "notanumber" },
      MULTI_REQUIRED_CONTRACT
    );
    expect(report.status).toBe("fail");
    expect(report.errors.some((e) => e.code === "FIELD_TYPE_MISMATCH" && e.path?.includes("age"))).toBe(true);
  });

  it("accepts numeric strings for number fields", () => {
    const report = validateInput(
      { name: "Alice", email: "a@b.com", age: "42" },
      MULTI_REQUIRED_CONTRACT
    );
    expect(report.valid).toBe(true);
  });

  it("accepts actual numbers for number fields", () => {
    const report = validateInput(
      { name: "Alice", email: "a@b.com", age: 42 },
      MULTI_REQUIRED_CONTRACT
    );
    expect(report.valid).toBe(true);
  });

  // Select validation
  it("returns fail when select value is not in options", () => {
    const report = validateInput(
      { original_prompt: "hello", learner_level: "expert" },
      SIMPLE_CONTRACT
    );
    expect(report.status).toBe("fail");
    expect(report.errors.some((e) => e.code === "FIELD_VALUE_NOT_IN_OPTIONS")).toBe(true);
  });

  it("returns pass when select value is in options", () => {
    const report = validateInput(
      { original_prompt: "hello", learner_level: "beginner" },
      SIMPLE_CONTRACT
    );
    expect(report.valid).toBe(true);
  });

  // Optional fields
  it("does not error for optional fields that are absent", () => {
    const report = validateInput(
      { original_prompt: "hello" },
      SIMPLE_CONTRACT
    );
    expect(report.status).toBe("pass");
  });

  // Unknown fields
  it("warns about unknown fields but does not block", () => {
    const report = validateInput(
      { original_prompt: "hello", _unknown_field: "x" },
      SIMPLE_CONTRACT
    );
    expect(report.valid).toBe(true);
    expect(report.warnings?.some((w) => w.includes("_unknown_field"))).toBe(true);
  });

  // Boolean validation
  it("fails when boolean field receives a string", () => {
    const contract: InputContract = {
      fields: [{ key: "agree", type: "boolean", label: "Agree" } as const],
      required_fields: ["agree"],
    };
    const report = validateInput({ agree: "yes" }, contract);
    expect(report.errors.some((e) => e.code === "FIELD_TYPE_MISMATCH")).toBe(true);
  });

  it("passes when boolean field receives actual boolean", () => {
    const contract: InputContract = {
      fields: [{ key: "agree", type: "boolean", label: "Agree" } as const],
      required_fields: ["agree"],
    };
    const report = validateInput({ agree: true }, contract);
    expect(report.valid).toBe(true);
  });
});
