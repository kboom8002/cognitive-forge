/**
 * AIProviderAdapter — interface for all AI model providers.
 *
 * ISOLATION: Must NOT import React, Next.js, Supabase, or apps/web.
 * Supabase store implementations are injected at the apps/web layer.
 *
 * The adapter abstracts provider-specific call mechanics. Implementations:
 *   - MockAIProvider      (deterministic, test/demo use)
 *   - OpenAIAdapter       (Sprint 08)
 *   - AnthropicAdapter    (Sprint 08)
 */

// ── Provider call config ──────────────────────────────────────────────────────

export interface ProviderCallConfig {
  /** Provider-specific model identifier, e.g. "gpt-4o", "claude-3-5-sonnet". */
  model: string;
  /** Sampling temperature. 0.0 = deterministic, 2.0 = creative. */
  temperature?: number | undefined;
  /** Maximum completion tokens. */
  max_tokens?: number | undefined;
  /** Wall-clock timeout in milliseconds. */
  timeout_ms?: number | undefined;
  /**
   * Casepack key passed through to providers for mock-map lookup.
   * Not sent to real AI providers — used only by MockAIProvider.
   */
  _casepack_key?: string | undefined;
}

// ── Provider call result ──────────────────────────────────────────────────────

export interface ProviderCallResult {
  /** Raw text returned by the AI model. Expected to be JSON for single_casepack. */
  raw_text: string;
  /** Input prompt token count (estimated or from provider response). */
  tokens_in: number;
  /** Completion token count (estimated or from provider response). */
  tokens_out: number;
  /** Model identifier used (may differ from requested due to failover). */
  model: string;
  /** Provider name (e.g. "mock", "openai", "anthropic"). */
  provider: string;
  /** Wall-clock latency in milliseconds. */
  latency_ms: number;
}

// ── Adapter interface ─────────────────────────────────────────────────────────

export interface AIProviderAdapter {
  /** Stable provider identifier, e.g. "mock", "openai", "anthropic". */
  readonly provider: string;

  /**
   * Send a prompt to the AI model and return the raw result.
   *
   * @param prompt   - The fully assembled prompt string (from ExecutionPlanBuilder).
   * @param config   - Provider call configuration derived from RuntimeContract.
   * @returns        ProviderCallResult with raw text and token counts.
   * @throws         AppError(INTERNAL_ERROR) on provider failure.
   */
  call(prompt: string, config: ProviderCallConfig): Promise<ProviderCallResult>;
}
