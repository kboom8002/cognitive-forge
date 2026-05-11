/**
 * tests/unit/runtime/repair-loop.test.ts
 */

import { describe, it, expect, vi } from "vitest";
import { repairLoop } from "@cognitive-forge/runtime";
import type { AIProviderAdapter, ProviderCallConfig, ProviderCallResult } from "@cognitive-forge/runtime";
import type { OutputContract, ValidationReport } from "@cognitive-forge/core";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CONTRACT: OutputContract = {
  fields: [
    { key: "summary",  type: "text", label: "Summary"  } as const,
    { key: "details",  type: "text", label: "Details"   } as const,
  ],
  required_fields: ["summary", "details"],
};

const VALID_OUTPUT = { summary: "Good summary", details: "Good details" };

const FAILED_REPORT: ValidationReport = {
  valid: false,
  status: "fail",
  errors: [{
    code: "MISSING_REQUIRED_OUTPUT_FIELD",
    message: 'Required output field "details" is missing or empty',
    path: ["details"],
    blocking: true,
  }],
  checked_at: new Date().toISOString(),
};

const CALL_CONFIG: ProviderCallConfig = { model: "gpt-4o" };

function makeAdapter(response: string): AIProviderAdapter {
  return {
    provider: "mock",
    call: vi.fn(async (): Promise<ProviderCallResult> => ({
      raw_text:   response,
      tokens_in:  10,
      tokens_out: 20,
      model:      "gpt-4o",
      provider:   "mock",
      latency_ms: 0,
    })),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("repairLoop", () => {
  it("repairs successfully when adapter returns valid output on first attempt", async () => {
    const adapter = makeAdapter(JSON.stringify(VALID_OUTPUT));
    const result = await repairLoop(
      adapter, "original prompt", CALL_CONFIG,
      { summary: "partial" }, FAILED_REPORT, CONTRACT, 2
    );
    expect(result.repaired).toBe(true);
    expect(result.attempts).toBe(1);
    expect(result.output).toEqual(VALID_OUTPUT);
  });

  it("gives up after maxAttempts when adapter keeps returning invalid output", async () => {
    const badOutput = { summary: "partial" }; // missing 'details'
    const adapter = makeAdapter(JSON.stringify(badOutput));
    const result = await repairLoop(
      adapter, "prompt", CALL_CONFIG,
      badOutput, FAILED_REPORT, CONTRACT, 3
    );
    expect(result.repaired).toBe(false);
    expect(result.attempts).toBe(3);
    expect(result.reports).toHaveLength(3);
  });

  it("collects all validation reports across attempts", async () => {
    const badOutput = { summary: "s" }; // still missing 'details'
    const adapter = makeAdapter(JSON.stringify(badOutput));
    const result = await repairLoop(
      adapter, "prompt", CALL_CONFIG,
      badOutput, FAILED_REPORT, CONTRACT, 2
    );
    expect(result.reports).toHaveLength(2);
    for (const report of result.reports) {
      expect(report.valid).toBe(false);
    }
  });

  it("accumulates token counts across repair calls", async () => {
    const adapter = makeAdapter(JSON.stringify(VALID_OUTPUT));
    const result = await repairLoop(
      adapter, "prompt", CALL_CONFIG,
      { summary: "s" }, FAILED_REPORT, CONTRACT, 2
    );
    expect(result.totalTokensIn).toBe(10);  // 1 call × 10
    expect(result.totalTokensOut).toBe(20); // 1 call × 20
  });

  it("handles JSON parse error in repair response", async () => {
    const adapter: AIProviderAdapter = {
      provider: "mock",
      call: vi.fn(async (): Promise<ProviderCallResult> => ({
        raw_text: "not valid json",
        tokens_in: 5, tokens_out: 10,
        model: "gpt-4o", provider: "mock", latency_ms: 0,
      })),
    };
    const result = await repairLoop(
      adapter, "prompt", CALL_CONFIG,
      { summary: "s" }, FAILED_REPORT, CONTRACT, 2
    );
    expect(result.repaired).toBe(false);
    const jsonErrors = result.reports.filter((r) =>
      r.errors.some((e) => e.code === "JSON_PARSE_ERROR")
    );
    expect(jsonErrors.length).toBeGreaterThan(0);
  });

  it("handles provider error during repair", async () => {
    const adapter: AIProviderAdapter = {
      provider: "mock",
      call: vi.fn(async () => { throw new Error("provider down"); }),
    };
    const result = await repairLoop(
      adapter, "prompt", CALL_CONFIG,
      { summary: "s" }, FAILED_REPORT, CONTRACT, 1
    );
    expect(result.repaired).toBe(false);
    expect(result.reports).toHaveLength(1);
  });
});
