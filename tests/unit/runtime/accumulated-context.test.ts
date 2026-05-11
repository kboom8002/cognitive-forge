import { describe, it, expect, vi } from "vitest";
import { runSequentialGraph } from "../../../packages/runtime/src/runner/sequential-graph-runner";
import type { GraphRunContext } from "../../../packages/runtime/src/runner/sequential-graph-runner";
import type { CasePackGraph, CasePackMAO, BridgeCasePack } from "@cognitive-forge/core";

// Mock AI provider
const mockAdapter = {
  provider: "mock",
  call: vi.fn(),
};

// Mock trace/usage stores
const mockTraceStore = { write: vi.fn() };
const mockUsageStore = { write: vi.fn() };
const traceWriter = {
  start: vi.fn(),
  step: vi.fn(),
  error: vi.fn(),
  complete: vi.fn(),
  output: vi.fn(),
} as any;
const usageWriter = { record: vi.fn() } as any;

const runStore = { create: vi.fn().mockResolvedValue("run-1"), update: vi.fn() };
const graphRunStore = { create: vi.fn().mockResolvedValue("graph-run-1"), update: vi.fn() };

describe("Graph Accumulated Context", () => {
  it("passes accumulated upstream outputs to subsequent nodes and bridges", async () => {
    // 3 nodes: A -> B -> C
    const graph: CasePackGraph = {
      key: "graph.test.v1",
      version: "1.0.0",
      status: "published",
      entry_node: "node_a",
      final_nodes: ["node_c"],
      nodes: [
        { id: "node_a", casepack_key: "pack.a" },
        { id: "node_b", casepack_key: "pack.b" },
        { id: "node_c", casepack_key: "pack.c" },
      ],
      edges: [
        { from: "node_a", to: "node_b" }, // No bridge, should merge accumulated context into node_b input
        { from: "node_b", to: "node_c", bridge_key: "bridge.b_to_c" },
      ],
    };

    const maoMap = new Map<string, CasePackMAO>([
      [
        "pack.a",
        {
          key: "pack.a",
          version: "1.0.0",
          status: "published",
          runtime_contract: { execution_type: "single_casepack", provider: "mock", model: "mock" },
          taskflow_cx: { R_role: "Role A", R_task: "Task A", R_format: "Format A" },
          input_contract: { fields: [], required_fields: [] },
          output_contract: {
            fields: [{ key: "field_a", type: "string" }],
            required_fields: ["field_a"],
          },
        } as unknown as CasePackMAO,
      ],
      [
        "pack.b",
        {
          key: "pack.b",
          version: "1.0.0",
          status: "published",
          runtime_contract: { execution_type: "single_casepack", provider: "mock", model: "mock" },
          taskflow_cx: { R_role: "Role B", R_task: "Task B", R_format: "Format B" },
          input_contract: { fields: [], required_fields: [] },
          output_contract: {
            fields: [{ key: "field_b", type: "string" }],
            required_fields: ["field_b"],
          },
        } as unknown as CasePackMAO,
      ],
      [
        "pack.c",
        {
          key: "pack.c",
          version: "1.0.0",
          status: "published",
          runtime_contract: { execution_type: "single_casepack", provider: "mock", model: "mock" },
          taskflow_cx: { R_role: "Role C", R_task: "Task C", R_format: "Format C" },
          input_contract: { fields: [], required_fields: [] },
          output_contract: {
            fields: [{ key: "final_c", type: "string" }],
            required_fields: ["final_c"],
          },
        } as unknown as CasePackMAO,
      ],
    ]);

    const bridgeMap = new Map<string, BridgeCasePack>([
      [
        "bridge.b_to_c",
        {
          key: "bridge.b_to_c",
          source_casepack_key: "pack.b",
          target_casepack_key: "pack.c",
          handoff_contract: { context_preservation: "partial", fields: [], required_fields: [] },
          mapping_rules: [
            // Select field from current node B
            { source_field: "field_b", target_field: "target_b" },
            // Select field from previous node A via accumulatedContext!
            { source_field: "node_a.field_a", target_field: "target_a_from_upstream" },
          ],
        } as unknown as BridgeCasePack,
      ],
    ]);

    // Setup mock outputs for each node
    // Node A outputs field_a
    // Node B outputs field_b
    // Node C outputs final_c
    mockAdapter.call
      .mockResolvedValueOnce({ raw_text: JSON.stringify({ field_a: "A" }), tokens_in: 1, tokens_out: 1, model: "mock", provider: "mock", latency_ms: 100 })
      .mockResolvedValueOnce({ raw_text: JSON.stringify({ field_b: "B" }), tokens_in: 1, tokens_out: 1, model: "mock", provider: "mock", latency_ms: 100 })
      .mockResolvedValueOnce({ raw_text: JSON.stringify({ final_c: "C" }), tokens_in: 1, tokens_out: 1, model: "mock", provider: "mock", latency_ms: 100 });

    const ctx: GraphRunContext = {
      graph,
      maoMap,
      bridgeMap,
      userInput: { initial: "start" },
      adapter: mockAdapter as any,
      traceWriter,
      usageWriter,
      runStore,
      graphRunStore,
      workspace_id: "ws-1",
      publicMode: true,
    };

    const result = await runSequentialGraph(ctx);
    if (result.status !== "success") {
      console.log(JSON.stringify(result, null, 2));
    }
    expect(result.status).toBe("success");

    // The mock adapter receives the prompt for each step.
    // The prompt contains the formatted user input.
    expect(mockAdapter.call.mock.calls[0][0]).toContain('initial: start');

    // Node B has NO bridge.
    // It should receive Node A's output merged with accumulated context: { "node_a.field_a": "A", field_a: "A" }
    expect(mockAdapter.call.mock.calls[1][0]).toContain('node_a.field_a: A');
    expect(mockAdapter.call.mock.calls[1][0]).toContain('field_a: A');

    // Node C uses a bridge from Node B.
    // The bridge maps "field_b" -> "target_b" and "node_a.field_a" -> "target_a_from_upstream".
    // Its input should be the mapped fields.
    expect(mockAdapter.call.mock.calls[2][0]).toContain('target_b: B');
    expect(mockAdapter.call.mock.calls[2][0]).toContain('target_a_from_upstream: A');

    // Verify accumulatedContext doesn't leak into the final output
    expect(result.final_output).toEqual({ final_c: "C" });
  });
});
