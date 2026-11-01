/**
 * ProviderFactory — creates AIProviderAdapter instances.
 *
 * Supports:
 *   - "mock"      (MockAIProvider — deterministic test/demo mode)
 *   - "openai"    (OpenAIAdapter — OpenAI Chat Completions API)
 *   - "anthropic" (AnthropicAdapter — Anthropic Messages API)
 *   - "gemini"    (GeminiAdapter — Google Gemini generateContent API)
 *
 * ISOLATION: No React, Next.js, Supabase, or apps/web imports.
 */

import { AppError, AppErrorCode } from "@cognitive-forge/core";
import type { AIProviderAdapter } from "./ai-provider";
import { MockAIProvider, type MockOutputMap } from "./mock-ai-provider";
import { OpenAIAdapter } from "./openai-provider";
import { AnthropicAdapter } from "./anthropic-provider";
import { GeminiAdapter } from "./gemini-provider";

// ── Provider registry ─────────────────────────────────────────────────────────

export type ProviderName = "mock" | "openai" | "anthropic" | "gemini";

export interface ProviderFactoryOptions {
  /**
   * Required when creating a "mock" provider.
   * Map from casepack_key → expected output object.
   */
  mockOutputMap?: MockOutputMap | undefined;
  /** Simulated latency in ms for mock provider. Default: 0 (no delay in tests). */
  mockLatencyMs?: number | undefined;
  /** Required when creating "openai", "anthropic", or "gemini" providers. */
  apiKey?: string | undefined;
  /** Optional custom API base URL override for live providers. */
  baseUrl?: string | undefined;
  /** Optional default model identifier for live providers. */
  defaultModel?: string | undefined;
}

// ── Factory function ──────────────────────────────────────────────────────────

/**
 * Creates and returns an AIProviderAdapter for the given provider name.
 *
 * @param provider - The provider identifier ("mock", "openai", "anthropic", "gemini").
 * @param opts     - Provider-specific options.
 * @throws AppError(INTERNAL_ERROR) if provider is unknown or missing required credentials.
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

    case "openai": {
      if (!opts.apiKey || opts.apiKey.trim().length === 0) {
        throw new AppError(
          AppErrorCode.INTERNAL_ERROR,
          'Provider "openai" requires opts.apiKey to be configured.'
        );
      }
      return new OpenAIAdapter({
        apiKey: opts.apiKey,
        baseUrl: opts.baseUrl,
        defaultModel: opts.defaultModel,
      });
    }

    case "anthropic": {
      if (!opts.apiKey || opts.apiKey.trim().length === 0) {
        throw new AppError(
          AppErrorCode.INTERNAL_ERROR,
          'Provider "anthropic" requires opts.apiKey to be configured.'
        );
      }
      return new AnthropicAdapter({
        apiKey: opts.apiKey,
        baseUrl: opts.baseUrl,
        defaultModel: opts.defaultModel,
      });
    }

    case "gemini": {
      if (!opts.apiKey || opts.apiKey.trim().length === 0) {
        throw new AppError(
          AppErrorCode.INTERNAL_ERROR,
          'Provider "gemini" requires opts.apiKey to be configured.'
        );
      }
      return new GeminiAdapter({
        apiKey: opts.apiKey,
        baseUrl: opts.baseUrl,
        defaultModel: opts.defaultModel,
      });
    }

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
