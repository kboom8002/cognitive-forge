/**
 * tests/unit/runtime/mock-ai-provider.test.ts
 *
 * Unit tests for MockAIProvider and ProviderFactory.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  MockAIProvider,
  OpenAIAdapter,
  AnthropicAdapter,
  GeminiAdapter,
  createProvider,
  MOCK_OUTPUT_MAP,
} from "@cognitive-forge/runtime";
import { AppError } from "@cognitive-forge/core";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SAMPLE_MAP = {
  "casepack.prompt_improvement_practice.v1": {
    diagnosis:               "Missing role and audience",
    improved_prompt:         "You are a science writer...",
    improvement_explanation: "Added role, audience, structure.",
  },
  "casepack.test.v1": {
    result: "mock result",
  },
} as const;

// ── MockAIProvider ────────────────────────────────────────────────────────────

describe("MockAIProvider", () => {
  it("returns raw_text as JSON.stringify of the mock output for a known key", async () => {
    const provider = new MockAIProvider(SAMPLE_MAP as Record<string, Record<string, unknown>>, 0);
    const result = await provider.call("some prompt", {
      model: "mock-model",
      _casepack_key: "casepack.prompt_improvement_practice.v1",
    });
    expect(result.raw_text).toBe(JSON.stringify(SAMPLE_MAP["casepack.prompt_improvement_practice.v1"]));
  });

  it("returns provider='mock'", async () => {
    const provider = new MockAIProvider(SAMPLE_MAP as Record<string, Record<string, unknown>>, 0);
    const result = await provider.call("prompt", {
      model: "gpt-4o",
      _casepack_key: "casepack.test.v1",
    });
    expect(result.provider).toBe("mock");
  });

  it("echoes the requested model in the result", async () => {
    const provider = new MockAIProvider(SAMPLE_MAP as Record<string, Record<string, unknown>>, 0);
    const result = await provider.call("prompt", {
      model: "gpt-4o",
      _casepack_key: "casepack.test.v1",
    });
    expect(result.model).toBe("gpt-4o");
  });

  it("estimates positive token counts proportional to text length", async () => {
    const provider = new MockAIProvider(SAMPLE_MAP as Record<string, Record<string, unknown>>, 0);
    const prompt = "a".repeat(400);
    const result = await provider.call(prompt, {
      model: "gpt-4o",
      _casepack_key: "casepack.test.v1",
    });
    expect(result.tokens_in).toBeGreaterThan(0);
    expect(result.tokens_out).toBeGreaterThan(0);
    // 400 chars / 4 ≈ 100 tokens_in
    expect(result.tokens_in).toBe(100);
  });

  it("throws AppError for unknown casepack_key", async () => {
    const provider = new MockAIProvider(SAMPLE_MAP as Record<string, Record<string, unknown>>, 0);
    await expect(
      provider.call("prompt", { model: "gpt-4o", _casepack_key: "casepack.nonexistent.v1" })
    ).rejects.toBeInstanceOf(AppError);
  });

  it("throws AppError when _casepack_key is not provided", async () => {
    const provider = new MockAIProvider(SAMPLE_MAP as Record<string, Record<string, unknown>>, 0);
    await expect(
      provider.call("prompt", { model: "gpt-4o" })
    ).rejects.toBeInstanceOf(AppError);
  });

  it("simulates latency when latencyMs > 0", async () => {
    const provider = new MockAIProvider(SAMPLE_MAP as Record<string, Record<string, unknown>>, 50);
    const start = Date.now();
    await provider.call("prompt", { model: "gpt-4o", _casepack_key: "casepack.test.v1" });
    expect(Date.now() - start).toBeGreaterThanOrEqual(40); // allow small timing slack
  });

  it("result includes latency_ms matching configured latency", async () => {
    const provider = new MockAIProvider(SAMPLE_MAP as Record<string, Record<string, unknown>>, 0);
    const result = await provider.call("prompt", { model: "gpt-4o", _casepack_key: "casepack.test.v1" });
    expect(result.latency_ms).toBe(0);
  });
});

// ── ProviderFactory ───────────────────────────────────────────────────────────

describe("ProviderFactory (createProvider)", () => {
  it("creates a MockAIProvider when provider='mock'", () => {
    const adapter = createProvider("mock", {
      mockOutputMap: SAMPLE_MAP as Record<string, Record<string, unknown>>,
    });
    expect(adapter.provider).toBe("mock");
  });

  it("throws for provider='openai' when apiKey is missing", () => {
    expect(() => createProvider("openai")).toThrow();
  });

  it("throws for provider='anthropic' when apiKey is missing", () => {
    expect(() => createProvider("anthropic")).toThrow();
  });

  it("throws for provider='gemini' when apiKey is missing", () => {
    expect(() => createProvider("gemini")).toThrow();
  });

  it("creates OpenAIAdapter when provider='openai' and apiKey is provided", () => {
    const adapter = createProvider("openai", { apiKey: "sk-test-123" });
    expect(adapter).toBeInstanceOf(OpenAIAdapter);
    expect(adapter.provider).toBe("openai");
  });

  it("creates AnthropicAdapter when provider='anthropic' and apiKey is provided", () => {
    const adapter = createProvider("anthropic", { apiKey: "sk-ant-test-123" });
    expect(adapter).toBeInstanceOf(AnthropicAdapter);
    expect(adapter.provider).toBe("anthropic");
  });

  it("creates GeminiAdapter when provider='gemini' and apiKey is provided", () => {
    const adapter = createProvider("gemini", { apiKey: "gemini-test-123" });
    expect(adapter).toBeInstanceOf(GeminiAdapter);
    expect(adapter.provider).toBe("gemini");
  });
});

// ── Live AI Provider Adapters (with mocked fetch) ─────────────────────────────

describe("Live AI Provider Adapters", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("OpenAIAdapter formats Chat Completions request and parses JSON output + token usage", async () => {
    const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          model: "gpt-4o-2024-08-06",
          choices: [{ message: { content: '{"summary":"OpenAI response"}' } }],
          usage: { prompt_tokens: 42, completion_tokens: 18 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const adapter = new OpenAIAdapter({ apiKey: "sk-test-key" });
    const res = await adapter.call("Produce summary JSON", { model: "gpt-4o" });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(res.provider).toBe("openai");
    expect(res.model).toBe("gpt-4o-2024-08-06");
    expect(res.raw_text).toBe('{"summary":"OpenAI response"}');
    expect(res.tokens_in).toBe(42);
    expect(res.tokens_out).toBe(18);
  });

  it("AnthropicAdapter strips optional markdown JSON fences and parses usage", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          content: [{ type: "text", text: "```json\n{\"summary\":\"Claude response\"}\n```" }],
          usage: { input_tokens: 55, output_tokens: 24 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const adapter = new AnthropicAdapter({ apiKey: "sk-ant-test-key" });
    const res = await adapter.call("Produce summary JSON", { model: "claude-3-5-sonnet-latest" });

    expect(res.provider).toBe("anthropic");
    expect(res.raw_text).toBe('{"summary":"Claude response"}');
    expect(res.tokens_in).toBe(55);
    expect(res.tokens_out).toBe(24);
  });

  it("GeminiAdapter parses candidate text and usageMetadata", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: '{"summary":"Gemini response"}' }],
              },
            },
          ],
          usageMetadata: { promptTokenCount: 30, candidatesTokenCount: 15 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const adapter = new GeminiAdapter({ apiKey: "gemini-key" });
    const res = await adapter.call("Produce summary JSON", { model: "gemini-2.0-flash" });

    expect(res.provider).toBe("gemini");
    expect(res.raw_text).toBe('{"summary":"Gemini response"}');
    expect(res.tokens_in).toBe(30);
    expect(res.tokens_out).toBe(15);
  });
});

// ── MOCK_OUTPUT_MAP fixture ───────────────────────────────────────────────────

describe("MOCK_OUTPUT_MAP (fixture)", () => {
  it("is a non-empty object", () => {
    expect(typeof MOCK_OUTPUT_MAP).toBe("object");
    expect(Object.keys(MOCK_OUTPUT_MAP).length).toBeGreaterThan(0);
  });

  it("contains the P0 prompt-improvement-practice key", () => {
    expect(MOCK_OUTPUT_MAP["casepack.prompt_improvement_practice.v1"]).toBeDefined();
  });

  it("mock output for prompt-improvement-practice has required fields", () => {
    const output = MOCK_OUTPUT_MAP["casepack.prompt_improvement_practice.v1"];
    expect(output).toHaveProperty("diagnosis");
    expect(output).toHaveProperty("improved_prompt");
    expect(output).toHaveProperty("improvement_explanation");
  });
});
