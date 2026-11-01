/**
 * AnthropicAdapter — live AIProviderAdapter implementation for Anthropic Messages API.
 *
 * Uses native global fetch so zero external SDK dependencies are required.
 * Strips optional markdown JSON code fences if the model wraps JSON output.
 *
 * ISOLATION: No React, Next.js, Supabase, or apps/web imports.
 */

import { AppError, AppErrorCode } from "@cognitive-forge/core";
import type { AIProviderAdapter, ProviderCallConfig, ProviderCallResult } from "./ai-provider";

export interface AnthropicAdapterOptions {
  apiKey: string;
  baseUrl?: string | undefined;
  defaultModel?: string | undefined;
  anthropicVersion?: string | undefined;
}

interface AnthropicMessagesResponse {
  model?: string;
  content?: Array<{
    type?: string;
    text?: string;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  error?: {
    message?: string;
  };
}

function stripJsonCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch?.[1]?.trim() ?? trimmed;
}

export class AnthropicAdapter implements AIProviderAdapter {
  readonly provider = "anthropic" as const;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly anthropicVersion: string;

  constructor(options: AnthropicAdapterOptions) {
    if (!options?.apiKey || options.apiKey.trim().length === 0) {
      throw new AppError(
        AppErrorCode.INTERNAL_ERROR,
        "AnthropicAdapter requires a non-empty apiKey"
      );
    }
    this.apiKey = options.apiKey.trim();
    this.baseUrl = (options.baseUrl ?? "https://api.anthropic.com/v1").replace(/\/+$/, "");
    this.defaultModel = options.defaultModel ?? "claude-3-5-sonnet-latest";
    this.anthropicVersion = options.anthropicVersion ?? "2023-06-01";
  }

  async call(prompt: string, config: ProviderCallConfig): Promise<ProviderCallResult> {
    const model = config.model || this.defaultModel;
    const timeoutMs = config.timeout_ms ?? 30_000;
    const start = Date.now();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": this.anthropicVersion,
        },
        body: JSON.stringify({
          model,
          max_tokens: config.max_tokens ?? 2048,
          temperature: config.temperature ?? 0.2,
          system:
            "You are a Cognitive Forge runtime execution engine. Respond ONLY with a valid JSON object matching the requested output contract. Do not include markdown code fences or commentary.",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
        signal: controller.signal,
      });

      const latency_ms = Math.max(0, Date.now() - start);
      const payload = (await response.json().catch(() => ({}))) as AnthropicMessagesResponse;

      if (!response.ok) {
        const errMsg = payload?.error?.message ?? `HTTP ${response.status}`;
        throw new AppError(
          AppErrorCode.INTERNAL_ERROR,
          `Anthropic API error (${response.status}): ${errMsg}`
        );
      }

      const rawBlock = payload?.content?.find((c) => typeof c.text === "string")?.text;
      if (typeof rawBlock !== "string" || rawBlock.trim().length === 0) {
        throw new AppError(
          AppErrorCode.INTERNAL_ERROR,
          "Anthropic API returned an empty message content"
        );
      }

      const rawText = stripJsonCodeFence(rawBlock);
      const tokens_in =
        payload.usage?.input_tokens ?? Math.max(1, Math.ceil(prompt.length / 4));
      const tokens_out =
        payload.usage?.output_tokens ?? Math.max(1, Math.ceil(rawText.length / 4));

      return {
        raw_text: rawText,
        tokens_in,
        tokens_out,
        model: payload.model ?? model,
        provider: this.provider,
        latency_ms,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        AppErrorCode.INTERNAL_ERROR,
        `AnthropicAdapter request failed: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
