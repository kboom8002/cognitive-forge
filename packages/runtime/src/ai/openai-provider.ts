/**
 * OpenAIAdapter — live AIProviderAdapter implementation for OpenAI Chat Completions API.
 *
 * Uses native global fetch so zero external SDK dependencies are required.
 * Enforces JSON output mode (`response_format: { type: "json_object" }`) and
 * wall-clock timeout via AbortController.
 *
 * ISOLATION: No React, Next.js, Supabase, or apps/web imports.
 */

import { AppError, AppErrorCode } from "@cognitive-forge/core";
import type { AIProviderAdapter, ProviderCallConfig, ProviderCallResult } from "./ai-provider";

export interface OpenAIAdapterOptions {
  apiKey: string;
  baseUrl?: string | undefined;
  defaultModel?: string | undefined;
}

interface OpenAIChatCompletionResponse {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  error?: {
    message?: string;
  };
}

export class OpenAIAdapter implements AIProviderAdapter {
  readonly provider = "openai" as const;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;

  constructor(options: OpenAIAdapterOptions) {
    if (!options?.apiKey || options.apiKey.trim().length === 0) {
      throw new AppError(
        AppErrorCode.INTERNAL_ERROR,
        "OpenAIAdapter requires a non-empty apiKey"
      );
    }
    this.apiKey = options.apiKey.trim();
    this.baseUrl = (options.baseUrl ?? "https://api.openai.com/v1").replace(/\/+$/, "");
    this.defaultModel = options.defaultModel ?? "gpt-4o";
  }

  async call(prompt: string, config: ProviderCallConfig): Promise<ProviderCallResult> {
    const model = config.model || this.defaultModel;
    const timeoutMs = config.timeout_ms ?? 30_000;
    const start = Date.now();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are a Cognitive Forge runtime execution engine. Always respond with valid JSON matching the requested output contract.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: config.temperature ?? 0.2,
          max_tokens: config.max_tokens ?? 2048,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      const latency_ms = Math.max(0, Date.now() - start);
      const payload = (await response.json().catch(() => ({}))) as OpenAIChatCompletionResponse;

      if (!response.ok) {
        const errMsg = payload?.error?.message ?? `HTTP ${response.status}`;
        throw new AppError(
          AppErrorCode.INTERNAL_ERROR,
          `OpenAI API error (${response.status}): ${errMsg}`
        );
      }

      const rawText = payload?.choices?.[0]?.message?.content;
      if (typeof rawText !== "string" || rawText.trim().length === 0) {
        throw new AppError(
          AppErrorCode.INTERNAL_ERROR,
          "OpenAI API returned an empty completion response"
        );
      }

      const tokens_in =
        payload.usage?.prompt_tokens ?? Math.max(1, Math.ceil(prompt.length / 4));
      const tokens_out =
        payload.usage?.completion_tokens ?? Math.max(1, Math.ceil(rawText.length / 4));

      return {
        raw_text: rawText.trim(),
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
        `OpenAIAdapter request failed: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
