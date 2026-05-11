/**
 * tests/unit/runtime/trace-writer.test.ts
 */

import { describe, it, expect, vi } from "vitest";
import { TraceWriter } from "@cognitive-forge/runtime";
import type { ITraceStore, TraceRecord } from "@cognitive-forge/runtime";

function createMockStore(): ITraceStore & { events: TraceRecord[] } {
  const events: TraceRecord[] = [];
  return {
    events,
    write: vi.fn(async (event: TraceRecord) => { events.push(event); }),
  };
}

describe("TraceWriter", () => {
  it("emits a start event with event_type='start'", async () => {
    const store = createMockStore();
    const writer = new TraceWriter(store);
    await writer.start("run-1", "casepack.test.v1");
    expect(store.events).toHaveLength(1);
    expect(store.events[0]!.event_type).toBe("start");
  });

  it("start event includes casepack_key", async () => {
    const store = createMockStore();
    const writer = new TraceWriter(store);
    await writer.start("run-1", "casepack.test.v1");
    expect(store.events[0]!.casepack_key).toBe("casepack.test.v1");
  });

  it("auto-increments sequence across multiple events", async () => {
    const store = createMockStore();
    const writer = new TraceWriter(store);
    await writer.start("run-1", "cp.test.v1");
    await writer.step("run-1", { phase: "a" });
    await writer.output("run-1", { phase: "b" });
    await writer.complete("run-1", { phase: "c" });

    expect(store.events[0]!.sequence).toBe(0);
    expect(store.events[1]!.sequence).toBe(1);
    expect(store.events[2]!.sequence).toBe(2);
    expect(store.events[3]!.sequence).toBe(3);
  });

  it("currentSequence returns the next sequence value", async () => {
    const store = createMockStore();
    const writer = new TraceWriter(store);
    expect(writer.currentSequence).toBe(0);
    await writer.start("run-1", "cp.test.v1");
    expect(writer.currentSequence).toBe(1);
  });

  it("sets run_type based on constructor parameter", async () => {
    const store = createMockStore();
    const writer = new TraceWriter(store, "graph");
    await writer.start("run-1", "cp.test.v1");
    expect(store.events[0]!.run_type).toBe("graph");
  });

  it("defaults run_type to 'casepack'", async () => {
    const store = createMockStore();
    const writer = new TraceWriter(store);
    await writer.start("run-1", "cp.test.v1");
    expect(store.events[0]!.run_type).toBe("casepack");
  });

  it("each event has run_id and created_at", async () => {
    const store = createMockStore();
    const writer = new TraceWriter(store);
    await writer.error("run-42", { err: "timeout" });
    expect(store.events[0]!.run_id).toBe("run-42");
    expect(store.events[0]!.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("payload is stored in trace_payload", async () => {
    const store = createMockStore();
    const writer = new TraceWriter(store);
    await writer.step("run-1", { foo: "bar", count: 42 });
    expect(store.events[0]!.trace_payload).toEqual({ foo: "bar", count: 42 });
  });

  it("repair event has event_type='repair'", async () => {
    const store = createMockStore();
    const writer = new TraceWriter(store);
    await writer.repair("run-1", { attempt: 1 });
    expect(store.events[0]!.event_type).toBe("repair");
  });

  it("fallback event has event_type='fallback'", async () => {
    const store = createMockStore();
    const writer = new TraceWriter(store);
    await writer.fallback("run-1", { reason: "max attempts" });
    expect(store.events[0]!.event_type).toBe("fallback");
  });
});
