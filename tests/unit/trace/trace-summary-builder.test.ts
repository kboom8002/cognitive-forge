import { describe, it, expect } from "vitest";
import { TraceSummaryBuilder } from "../../../packages/runtime/src/trace/trace-summary-builder";
import type { TraceRecord } from "../../../packages/runtime/src/trace/trace-writer";

describe("TraceSummaryBuilder", () => {
  const baseRecord = (
    event_type: string,
    phase: string | undefined,
    payload: Record<string, unknown> = {}
  ): TraceRecord => ({
    run_id: "test-run",
    run_type: "casepack",
    event_type,
    trace_payload: phase ? { phase, ...payload } : payload,
    sequence: 0,
    created_at: new Date().toISOString()
  });

  it("T1: converts sequential TraceRecord events to friendly PublicTraceSummary", () => {
    const traces: TraceRecord[] = [
      baseRecord("start", undefined, { casepack_key: "pack1" }),
      baseRecord("step", "input_validated"),
      baseRecord("step", "plan_built", { provider: "openai" }), // Should be skipped in public
      baseRecord("step", "node_start", { node_id: "book_intake", casepack_key: "cp1" }),
      baseRecord("step", "node_complete", { node_id: "book_intake" }),
      baseRecord("step", "bridge_complete", { bridge_key: "b1", from_node: "n1", to_node: "n2" }),
      baseRecord("complete", undefined)
    ];

    const summary = TraceSummaryBuilder.buildPublicSummary(traces);

    expect(summary).toHaveLength(6); // start, input_validated, node_start, node_complete, bridge_complete, complete
    expect(summary[0].label).toBe("Run Started");
    expect(summary[1].label).toBe("Input Validated");
    expect(summary[2].label).toBe("Executing Node: book_intake");
    expect(summary[3].label).toBe("Node Completed: book_intake");
    expect(summary[4].label).toBe("Bridge Handoff Completed");
    expect(summary[5].label).toBe("Run Completed");
    
    // Check status properties
    expect(summary[0].status).toBe("success");
    expect(summary[2].status).toBe("running"); // Node start might be interpreted as running
  });

  it("T2: public trace summary contains no raw payloads", () => {
    const traces: TraceRecord[] = [
      baseRecord("output", "ai_output_received", { output_keys: ["key1"], secret_payload: "supersecret", raw_text: "{}" })
    ];

    const summary = TraceSummaryBuilder.buildPublicSummary(traces);
    
    // Ensure the output contains no 'secret_payload' anywhere
    const json = JSON.stringify(summary);
    expect(json).not.toContain("secret_payload");
    expect(json).not.toContain("supersecret");
    expect(json).not.toContain("raw_text");
    
    // It should have a safe label
    expect(summary[0].label).toBe("AI Output Received");
    expect(summary[0].details).toBeUndefined(); // No details in public by default
  });

  it("T3: builder mode can see richer summaries without exposing secrets", () => {
    const traces: TraceRecord[] = [
      baseRecord("output", "ai_output_received", { output_keys: ["key1"], tokens_in: 100, tokens_out: 50, secret_payload: "supersecret", raw_text: "{}" })
    ];

    const summary = TraceSummaryBuilder.buildBuilderSummary(traces);
    
    expect(summary[0].label).toBe("AI Output Received");
    // Builder sees tokens but NOT raw text
    expect(summary[0].details).toHaveProperty("tokens_in", 100);
    expect(summary[0].details).toHaveProperty("tokens_out", 50);
    expect(summary[0].details).toHaveProperty("output_keys");
    
    const json = JSON.stringify(summary);
    expect(json).not.toContain("secret_payload");
    expect(json).not.toContain("supersecret");
    expect(json).not.toContain("raw_text");
  });
});
