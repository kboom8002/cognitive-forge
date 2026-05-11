/**
 * tests/unit/runtime/usage-writer.test.ts
 */

import { describe, it, expect, vi } from "vitest";
import { UsageWriter } from "@cognitive-forge/runtime";
import type { IUsageStore, UsageRecord } from "@cognitive-forge/runtime";

function createMockStore(): IUsageStore & { events: UsageRecord[] } {
  const events: UsageRecord[] = [];
  return {
    events,
    write: vi.fn(async (event: UsageRecord) => { events.push(event); }),
  };
}

describe("UsageWriter", () => {
  it("writes a usage event with all required fields", async () => {
    const store = createMockStore();
    const writer = new UsageWriter(store);
    await writer.record({
      run_id:          "run-1",
      workspace_id:    "ws-1",
      casepack_key:    "casepack.test.v1",
      provider:        "mock",
      model:           "gpt-4o",
      tokens_in:       100,
      tokens_out:      200,
      repair_attempts: 0,
    });

    expect(store.events).toHaveLength(1);
    const e = store.events[0]!;
    expect(e.run_id).toBe("run-1");
    expect(e.workspace_id).toBe("ws-1");
    expect(e.casepack_key).toBe("casepack.test.v1");
    expect(e.provider).toBe("mock");
    expect(e.model).toBe("gpt-4o");
    expect(e.tokens_in).toBe(100);
    expect(e.tokens_out).toBe(200);
    expect(e.repair_attempts).toBe(0);
  });

  it("includes created_at as ISO timestamp", async () => {
    const store = createMockStore();
    const writer = new UsageWriter(store);
    await writer.record({
      run_id: "run-1", workspace_id: "ws-1", provider: "mock",
      model: "m", tokens_in: 0, tokens_out: 0, repair_attempts: 0,
    });
    expect(store.events[0]!.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("handles optional cost_usd", async () => {
    const store = createMockStore();
    const writer = new UsageWriter(store);
    await writer.record({
      run_id: "run-1", workspace_id: "ws-1", provider: "openai",
      model: "gpt-4o", tokens_in: 100, tokens_out: 200,
      repair_attempts: 0, cost_usd: 0.005,
    });
    expect(store.events[0]!.cost_usd).toBe(0.005);
  });

  it("handles zero tokens gracefully", async () => {
    const store = createMockStore();
    const writer = new UsageWriter(store);
    await writer.record({
      run_id: "run-1", workspace_id: "ws-1", provider: "mock",
      model: "m", tokens_in: 0, tokens_out: 0, repair_attempts: 0,
    });
    expect(store.events[0]!.tokens_in).toBe(0);
    expect(store.events[0]!.tokens_out).toBe(0);
  });
});
