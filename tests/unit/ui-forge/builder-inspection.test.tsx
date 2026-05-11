/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BuilderInspectionPanel } from "../../../packages/ui-forge/src/builder/BuilderInspectionPanel";
import { buildSafeBuilderSummary } from "../../../packages/runtime/src/builder/builder-sanitizer";

describe("BuilderInspectionPanel", () => {
  const rawContext = {
    casepack_keys: ["cp.test.v1", "cp.test.v2"],
    graph_key: "graph.test.v1",
    bridges: [
      { key: "bridge.v1", mapped_data: { out: "{{source.in}}" } }
    ],
    validation_status: "pass",
    trace_events: [{ type: "node_start" }],
    // Secrets that must be stripped
    secrets: { OPENAI_API_KEY: "sk-12345" },
    model_credentials: { provider: "openai" },
    system_prompts: ["You are a helpful assistant."]
  };

  it("T5: buildSafeBuilderSummary strips secrets and system prompts", () => {
    const summary = buildSafeBuilderSummary(rawContext);
    expect(summary.casepack_keys).toEqual(["cp.test.v1", "cp.test.v2"]);
    expect(summary.graph_key).toBe("graph.test.v1");
    expect((summary as any).secrets).toBeUndefined();
    expect((summary as any).model_credentials).toBeUndefined();
    expect((summary as any).system_prompts).toBeUndefined();
  });

  it("T1: Returns null when publicMode is true", () => {
    const summary = buildSafeBuilderSummary(rawContext);
    const { container } = render(<BuilderInspectionPanel summary={summary} publicMode={true} />);
    expect(container.firstChild).toBeNull();
  });

  it("T2, T3, T4: Renders CasePack, Graph, and Bridge summaries when publicMode is false", () => {
    const summary = buildSafeBuilderSummary(rawContext);
    render(<BuilderInspectionPanel summary={summary} publicMode={false} />);
    
    // Check CasePack keys are rendered
    expect(screen.getByText("cp.test.v1")).toBeDefined();
    expect(screen.getByText("cp.test.v2")).toBeDefined();
    
    // Check Graph Key
    expect(screen.getByText(/graph\.test\.v1/)).toBeDefined();

    // Check Bridge
    fireEvent.click(screen.getByRole("button", { name: "Bridges" }));
    expect(screen.getByText(/bridge\.v1/)).toBeDefined();
    expect(screen.getByText(/\{\{source\.in\}\}/)).toBeDefined();
  });
});
