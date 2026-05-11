/**
 * tests/unit/bridge/handoff-validator.test.ts
 *
 * Unit tests for validateHandoff.
 */

import { describe, it, expect } from "vitest";
import { validateHandoff } from "@cognitive-forge/bridge";
import type { HandoffContract } from "@cognitive-forge/core";

const CONTRACT: HandoffContract = {
  source_casepack_key: "casepack.a.v1",
  target_casepack_key: "casepack.b.v1",
  fields: [
    { key: "company_overview",    type: "text", label: "Company Overview"    },
    { key: "target_audience",     type: "text", label: "Target Audience"     },
    { key: "key_differentiators", type: "text", label: "Key Differentiators" },
  ],
  context_preservation: "partial",
};

const VALID_DATA = {
  company_overview:    "Acme Corp is a B2B SaaS company",
  target_audience:     "Mid-market executives",
  key_differentiators: "Speed, accessibility, AI-native",
};

describe("validateHandoff — valid data", () => {
  it("returns valid=true when all required fields are present and non-empty", () => {
    const result = validateHandoff(VALID_DATA, CONTRACT);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe("validateHandoff — missing fields", () => {
  it("returns valid=false when a required field is missing", () => {
    const data = { company_overview: "Acme Corp" }; // missing target_audience, key_differentiators
    const result = validateHandoff(data, CONTRACT);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("error references the missing field key", () => {
    const data = { company_overview: "Acme Corp" };
    const result = validateHandoff(data, CONTRACT);
    const errorKeys = result.errors.map((e) => e.field);
    expect(errorKeys).toContain("target_audience");
    expect(errorKeys).toContain("key_differentiators");
  });

  it("returns valid=false when field value is null", () => {
    const data = { ...VALID_DATA, company_overview: null };
    const result = validateHandoff(data as Record<string, unknown>, CONTRACT);
    expect(result.valid).toBe(false);
  });
});

describe("validateHandoff — empty text fields", () => {
  it("returns valid=false when a text field is empty string", () => {
    const data = { ...VALID_DATA, company_overview: "" };
    const result = validateHandoff(data, CONTRACT);
    expect(result.valid).toBe(false);
    const errorKeys = result.errors.map((e) => e.field);
    expect(errorKeys).toContain("company_overview");
  });

  it("returns valid=false when a text field is whitespace only", () => {
    const data = { ...VALID_DATA, company_overview: "   " };
    const result = validateHandoff(data, CONTRACT);
    expect(result.valid).toBe(false);
  });
});

describe("validateHandoff — type checking", () => {
  it("allows numbers for text fields (coercible)", () => {
    const data = { ...VALID_DATA, company_overview: 42 };
    const result = validateHandoff(data as Record<string, unknown>, CONTRACT);
    // Numbers are coercible to string — should not produce an error
    expect(result.errors.find((e) => e.field === "company_overview")).toBeUndefined();
  });

  it("returns error when text field receives an object", () => {
    const data = { ...VALID_DATA, company_overview: { nested: "object" } };
    const result = validateHandoff(data as Record<string, unknown>, CONTRACT);
    expect(result.valid).toBe(false);
    const errorKeys = result.errors.map((e) => e.field);
    expect(errorKeys).toContain("company_overview");
  });

  it("validates number fields correctly", () => {
    const numContract: HandoffContract = {
      source_casepack_key: "casepack.a.v1",
      target_casepack_key: "casepack.b.v1",
      fields: [{ key: "score", type: "number", label: "Score" }],
      context_preservation: "partial",
    };
    expect(validateHandoff({ score: 95 }, numContract).valid).toBe(true);
    expect(validateHandoff({ score: "not-a-number" }, numContract).valid).toBe(false);
  });
});

describe("validateHandoff — additional fields in mappedData", () => {
  it("does not fail because of extra fields in mappedData", () => {
    const data = { ...VALID_DATA, extra_field: "extra" };
    const result = validateHandoff(data, CONTRACT);
    expect(result.valid).toBe(true);
  });
});
