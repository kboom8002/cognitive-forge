/**
 * tests/unit/runtime/public-output-sanitizer.test.ts
 */

import { describe, it, expect } from "vitest";
import { sanitizePublicOutput } from "@cognitive-forge/runtime";
import type { OutputContract } from "@cognitive-forge/core";

const CONTRACT_WITH_PUBLIC: OutputContract = {
  fields: [
    { key: "diagnosis",               type: "text", label: "Diagnosis"   } as const,
    { key: "improved_prompt",         type: "text", label: "Improved"    } as const,
    { key: "improvement_explanation", type: "text", label: "Explanation" } as const,
    { key: "internal_debug",          type: "text", label: "Debug"       } as const,
  ],
  required_fields: ["diagnosis", "improved_prompt", "improvement_explanation"],
  public_fields:   ["diagnosis", "improved_prompt", "improvement_explanation"],
};

const CONTRACT_NO_PUBLIC: OutputContract = {
  fields: [
    { key: "summary",  type: "text", label: "Summary"  } as const,
    { key: "details",  type: "text", label: "Details"   } as const,
  ],
  required_fields: ["summary"],
};

describe("sanitizePublicOutput", () => {
  it("returns only public_fields when specified", () => {
    const output = {
      diagnosis: "d", improved_prompt: "ip", improvement_explanation: "ie",
      internal_debug: "secret",
    };
    const result = sanitizePublicOutput(output, CONTRACT_WITH_PUBLIC);
    expect(result).toHaveProperty("diagnosis");
    expect(result).toHaveProperty("improved_prompt");
    expect(result).toHaveProperty("improvement_explanation");
    expect(result).not.toHaveProperty("internal_debug");
  });

  it("returns all contract fields when public_fields is empty", () => {
    const output = { summary: "s", details: "d", _extra: "x" };
    const result = sanitizePublicOutput(output, CONTRACT_NO_PUBLIC);
    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("details");
    expect(result).not.toHaveProperty("_extra");
  });

  it("strips forbidden keys even if in public_fields", () => {
    const contract: OutputContract = {
      fields: [
        { key: "summary",       type: "text", label: "Summary" } as const,
        { key: "execution_plan", type: "text", label: "Plan"    } as const, // FORBIDDEN
      ],
      required_fields: ["summary"],
      public_fields:   ["summary", "execution_plan"], // execution_plan is forbidden
    };
    const output = { summary: "s", execution_plan: "should be stripped" };
    const result = sanitizePublicOutput(output, contract);
    expect(result).toHaveProperty("summary");
    expect(result).not.toHaveProperty("execution_plan");
  });

  it("strips unknown keys not in contract fields", () => {
    const output = { summary: "s", _hidden: "x", random: "y" };
    const result = sanitizePublicOutput(output, CONTRACT_NO_PUBLIC);
    expect(Object.keys(result)).toEqual(["summary"]);
  });

  it("returns empty object for empty output", () => {
    const result = sanitizePublicOutput({}, CONTRACT_WITH_PUBLIC);
    expect(result).toEqual({});
  });

  it("does not include absent public fields in output", () => {
    const output = { diagnosis: "d" }; // missing improved_prompt, improvement_explanation
    const result = sanitizePublicOutput(output, CONTRACT_WITH_PUBLIC);
    expect(Object.keys(result)).toEqual(["diagnosis"]);
  });

  it("strips multiple forbidden keys", () => {
    const contract: OutputContract = {
      fields: [
        { key: "summary",        type: "text", label: "Summary"  } as const,
        { key: "casepack_json",   type: "text", label: "CJ"      } as const,
        { key: "trace_payload",   type: "text", label: "TP"       } as const,
        { key: "repair_attempts", type: "text", label: "RA"       } as const,
      ],
      required_fields: ["summary"],
      public_fields:   ["summary", "casepack_json", "trace_payload", "repair_attempts"],
    };
    const output = { summary: "s", casepack_json: "x", trace_payload: "y", repair_attempts: "z" };
    const result = sanitizePublicOutput(output, contract);
    expect(Object.keys(result)).toEqual(["summary"]);
  });
});
