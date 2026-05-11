/**
 * tests/unit/runtime/fallback-handler.test.ts
 */

import { describe, it, expect } from "vitest";
import { handleFallback, FALLBACK_PLACEHOLDER } from "@cognitive-forge/runtime";
import type { RepairResult } from "@cognitive-forge/runtime";
import type { OutputContract, ValidationReport } from "@cognitive-forge/core";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CONTRACT: OutputContract = {
  fields: [
    { key: "summary",  type: "text", label: "Summary"  } as const,
    { key: "details",  type: "text", label: "Details"   } as const,
    { key: "optional", type: "text", label: "Optional"  } as const,
  ],
  required_fields: ["summary", "details"],
};

const PASS_REPORT: ValidationReport = {
  valid: true, status: "pass", errors: [], checked_at: new Date().toISOString(),
};

const FAIL_REPORT: ValidationReport = {
  valid: false, status: "fail",
  errors: [{ code: "MISSING", message: "missing details", blocking: true }],
  checked_at: new Date().toISOString(),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("handleFallback", () => {
  it("returns repaired output with fallback_used=false when repair succeeded", () => {
    const repairResult: RepairResult = {
      repaired: true, output: { summary: "s", details: "d" },
      attempts: 1, reports: [PASS_REPORT], totalTokensIn: 10, totalTokensOut: 20,
    };
    const result = handleFallback(CONTRACT, { summary: "s" }, repairResult);
    expect(result.fallback_used).toBe(false);
    expect(result.output).toEqual({ summary: "s", details: "d" });
  });

  it("fills missing required fields with placeholder when repair failed", () => {
    const repairResult: RepairResult = {
      repaired: false, output: { summary: "partial" },
      attempts: 2, reports: [FAIL_REPORT, FAIL_REPORT], totalTokensIn: 0, totalTokensOut: 0,
    };
    const result = handleFallback(CONTRACT, { summary: "partial" }, repairResult);
    expect(result.fallback_used).toBe(true);
    expect(result.output.summary).toBe("partial");
    expect(result.output.details).toBe(FALLBACK_PLACEHOLDER);
  });

  it("preserves valid required fields from failed output", () => {
    const repairResult: RepairResult = {
      repaired: false, output: { summary: "good", details: "also good" },
      attempts: 2, reports: [FAIL_REPORT], totalTokensIn: 0, totalTokensOut: 0,
    };
    const result = handleFallback(CONTRACT, { summary: "good", details: "also good" }, repairResult);
    expect(result.output.summary).toBe("good");
    expect(result.output.details).toBe("also good");
  });

  it("does not include optional fields that are absent from the output", () => {
    const repairResult: RepairResult = {
      repaired: false, output: { summary: "s" },
      attempts: 1, reports: [FAIL_REPORT], totalTokensIn: 0, totalTokensOut: 0,
    };
    const result = handleFallback(CONTRACT, { summary: "s" }, repairResult);
    expect(result.output).not.toHaveProperty("optional");
  });

  it("returns descriptive reason mentioning attempt count", () => {
    const repairResult: RepairResult = {
      repaired: false, output: { summary: "s" },
      attempts: 3, reports: [], totalTokensIn: 0, totalTokensOut: 0,
    };
    const result = handleFallback(CONTRACT, { summary: "s" }, repairResult);
    expect(result.reason).toContain("3 attempt");
    expect(result.reason).toContain("Filled");
  });

  it("FALLBACK_PLACEHOLDER is a human-readable retry message", () => {
    expect(FALLBACK_PLACEHOLDER).toContain("failed");
    expect(FALLBACK_PLACEHOLDER).toContain("try again");
  });
});
