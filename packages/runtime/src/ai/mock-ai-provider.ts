/**
 * MockAIProvider — deterministic AI provider for testing and demo runs.
 *
 * Reads from an injected output map (keyed by casepack_key) and returns
 * pre-canned JSON responses. This allows end-to-end testing of the full
 * runtime pipeline without real AI provider credentials.
 *
 * Usage:
 *   const map = JSON.parse(fs.readFileSync("mock-output-map.json", "utf-8"));
 *   const provider = new MockAIProvider(map);
 *
 * ISOLATION: No React, Next.js, Supabase, or apps/web imports.
 */

import { AppError, AppErrorCode } from "@cognitive-forge/core";
import type { AIProviderAdapter, ProviderCallConfig, ProviderCallResult } from "./ai-provider";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Map from casepack_key → mock output object. */
export type MockOutputMap = Record<string, Record<string, unknown>>;

// ── MockAIProvider ────────────────────────────────────────────────────────────

export class MockAIProvider implements AIProviderAdapter {
  readonly provider = "mock" as const;

  /**
   * @param outputMap    - Map from casepack_key → mock output. Can be loaded
   *                       from docs/fixtures/mock-ai/mock-output-map.json.
   * @param latencyMs    - Simulated response latency in milliseconds. Default 50.
   */
  constructor(
    private readonly outputMap: MockOutputMap,
    private readonly latencyMs: number = 50
  ) {}

  async call(prompt: string, config: ProviderCallConfig): Promise<ProviderCallResult> {
    const casepackKey = config._casepack_key;

    if (!casepackKey) {
      throw new AppError(
        AppErrorCode.INTERNAL_ERROR,
        "MockAIProvider requires _casepack_key in ProviderCallConfig to look up mock output"
      );
    }

    const mockOutput = this.outputMap[casepackKey];

    if (!mockOutput) {
      throw new AppError(
        AppErrorCode.INTERNAL_ERROR,
        `MockAIProvider: no mock output registered for casepack_key "${casepackKey}". ` +
        `Available keys: ${Object.keys(this.outputMap).join(", ") || "(none)"}`
      );
    }

    // Simulate latency
    if (this.latencyMs > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, this.latencyMs));
    }

    const raw_text = JSON.stringify(mockOutput);

    // Estimate token counts (rough approximation: 1 token ≈ 4 chars)
    const tokens_in  = Math.max(1, Math.ceil(prompt.length / 4));
    const tokens_out = Math.max(1, Math.ceil(raw_text.length / 4));

    return {
      raw_text,
      tokens_in,
      tokens_out,
      model:       config.model,
      provider:    this.provider,
      latency_ms:  this.latencyMs,
    };
  }
}
