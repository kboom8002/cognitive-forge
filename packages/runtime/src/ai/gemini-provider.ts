/**
 * GeminiAdapter — live AIProviderAdapter implementation for Google Gemini generateContent API.
 *
 * Uses native global fetch so zero external SDK dependencies are required.
 * Requests `responseMimeType: "application/json"` for structured JSON output.
 *
 * ISOLATION: No React, Next.js, Supabase, or apps/web imports.
 */

import { AppError, AppErrorCode } from "@cognitive-forge/core";
import type { AIProviderAdapter, ProviderCallConfig, ProviderCallResult } from "./ai-provider";

export interface GeminiAdapterOptions {
  apiKey: string;
  baseUrl?: string | undefined;
  defaultModel?: string | undefined;
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
  error?: {
    message?: string;
  };
}

export class GeminiAdapter implements AIProviderAdapter {
  readonly provider = "gemini" as const;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;

  constructor(options: GeminiAdapterOptions) {
    if (!options?.apiKey || options.apiKey.trim().length === 0) {
      throw new AppError(
        AppErrorCode.INTERNAL_ERROR,
        "GeminiAdapter requires a non-empty apiKey"
      );
    }
    this.apiKey = options.apiKey.trim();
    this.baseUrl = (
      options.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta"
    ).replace(/\/+$/, "");
    this.defaultModel = options.defaultModel ?? "gemini-2.0-flash";
  }

  async call(prompt: string, config: ProviderCallConfig): Promise<ProviderCallResult> {
    const model = config.model || this.defaultModel;
    const timeoutMs = config.timeout_ms ?? 30_000;
    const start = Date.now();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const endpoint = `${this.baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: "You are a Cognitive Forge runtime execution engine. Always respond with valid JSON matching the requested output contract.",
              },
            ],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: config.temperature ?? 0.2,
            maxOutputTokens: config.max_tokens ?? 2048,
            responseMimeType: "application/json",
          },
        }),
        signal: controller.signal,
      });

      const latency_ms = Math.max(0, Date.now() - start);
      const payload = (await response.json().catch(() => ({}))) as GeminiGenerateContentResponse;

      if (!response.ok) {
        const errMsg = payload?.error?.message ?? `HTTP ${response.status}`;
        throw new AppError(
          AppErrorCode.INTERNAL_ERROR,
          `Gemini API error (${response.status}): ${errMsg}`
        );
      }

      const rawText = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof rawText !== "string" || rawText.trim().length === 0) {
        throw new AppError(
          AppErrorCode.INTERNAL_ERROR,
          "Gemini API returned an empty candidate response"
        );
      }

      const tokens_in =
        payload.usageMetadata?.promptTokenCount ?? Math.max(1, Math.ceil(prompt.length / 4));
      const tokens_out =
        payload.usageMetadata?.candidatesTokenCount ?? Math.max(1, Math.ceil(rawText.length / 4));

      return {
        raw_text: rawText.trim(),
        tokens_in,
        tokens_out,
        model,
        provider: this.provider,
        latency_ms,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        AppErrorCode.INTERNAL_ERROR,
        `GeminiAdapter request failed: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
