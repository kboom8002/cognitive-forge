/**
 * ProviderFactory — creates AIProviderAdapter instances.
 *
 * In Sprint 06, the only available provider is "mock".
 * Real providers (openai, anthropic) will be added in Sprint 08.
 *
 * ISOLATION: No React, Next.js, Supabase, or apps/web imports.
 */

import { AppError, AppErrorCode } from "@cognitive-forge/core";
import type { AIProviderAdapter } from "./ai-provider";
import { MockAIProvider, type MockOutputMap } from "./mock-ai-provider";

// ── Provider registry ─────────────────────────────────────────────────────────

export type ProviderName = "mock" | "openai" | "anthropic";

export interface ProviderFactoryOptions {
  /**
   * Required when creating a "mock" provider.
   * Map from casepack_key → expected output object.
   */
  mockOutputMap?: MockOutputMap | undefined;
  /** Simulated latency in ms for mock provider. Default: 0 (no delay in tests). */
  mockLatencyMs?: number | undefined;
}

// ── Factory function ──────────────────────────────────────────────────────────

/**
 * Creates and returns an AIProviderAdapter for the given provider name.
 *
 * @param provider - The provider identifier (e.g. "mock", "openai").
 * @param opts     - Provider-specific options.
 * @throws AppError(INTERNAL_ERROR) if provider is unknown or misconfigured.
 */
export function createProvider(
  provider: ProviderName,
  opts: ProviderFactoryOptions = {}
): AIProviderAdapter {
  switch (provider) {
    case "mock": {
      const map = opts.mockOutputMap ?? {};
      const latency = opts.mockLatencyMs ?? 0;
      return new MockAIProvider(map, latency);
    }

    case "openai":
    case "anthropic":
      throw new AppError(
        AppErrorCode.INTERNAL_ERROR,
        `Provider "${provider}" is not yet implemented — available in Sprint 08. ` +
        `Use provider="mock" for development and testing.`
      );

    default: {
      // Exhaustiveness check — TypeScript will error if a new ProviderName is added without handling
      const _exhaustive: never = provider;
      throw new AppError(
        AppErrorCode.INTERNAL_ERROR,
        `Unknown provider: "${String(_exhaustive)}"`
      );
    }
  }
}
