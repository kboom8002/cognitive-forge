/**
 * tests/unit/ui-forge/composite.test.tsx
 *
 * Unit tests for CompositeAppRenderer and GraphStepper.
 * Environment: jsdom
 *
 * Covers:
 * - GraphStepper: step chips, status classes, progress label
 * - CompositeAppRenderer: initial render, form submission flow, step progress,
 *   final OutputCard rendering, partial result banner, error state
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

import { GraphStepper }          from "@cognitive-forge/ui-forge";
import { CompositeAppRenderer }  from "@cognitive-forge/ui-forge";
import type {
  GraphStep,
  PublicGraphRunResult,
  CompositeAppRendererProps,
} from "@cognitive-forge/ui-forge";
import type { InputContract, OutputContract } from "@cognitive-forge/core";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const THREE_STEPS: GraphStep[] = [
  { id: "step_1", label: "Prompt Improvement",  status: "complete" },
  { id: "step_2", label: "Rubric Evaluation",   status: "active"   },
  { id: "step_3", label: "Learner Feedback",    status: "pending"  },
];

const ALL_COMPLETE_STEPS: GraphStep[] = [
  { id: "step_1", label: "Prompt Improvement",  status: "complete" },
  { id: "step_2", label: "Rubric Evaluation",   status: "complete" },
  { id: "step_3", label: "Learner Feedback",    status: "complete" },
];

const FAILED_STEPS: GraphStep[] = [
  { id: "step_1", label: "Prompt Improvement",  status: "complete" },
  { id: "step_2", label: "Rubric Evaluation",   status: "failed"   },
  { id: "step_3", label: "Learner Feedback",    status: "pending"  },
];

const GRAPH_NODES = [
  { id: "step_1", label: "Prompt Improvement"  },
  { id: "step_2", label: "Rubric Evaluation"   },
  { id: "step_3", label: "Learner Feedback"    },
];

const INPUT_CONTRACT: InputContract = {
  fields: [{ key: "original_prompt", type: "text", label: "Original Prompt" }],
  required_fields: ["original_prompt"],
};

const OUTPUT_CONTRACT: OutputContract = {
  fields: [
    { key: "learner_feedback", type: "text",   label: "Learner Feedback" },
    { key: "next_practice",    type: "string", label: "Next Practice"    },
    { key: "internal_score",   type: "string", label: "Internal Score"   },
  ],
  required_fields: ["learner_feedback", "next_practice"],
  public_fields:   ["learner_feedback", "next_practice"],  // internal_score excluded
};

const SUCCESS_RESULT: PublicGraphRunResult = {
  status:               "success",
  final_output:         { learner_feedback: "Great progress!", next_practice: "Try constraints." },
  completed_node_count: 3,
  progress_label:       "Completed 3 steps successfully",
  completed_nodes:      ["step_1", "step_2", "step_3"],
  validation_status:    "pass",
};

const PARTIAL_RESULT: PublicGraphRunResult = {
  status:               "partial",
  final_output:         { learner_feedback: "Partial result" },
  completed_node_count: 1,
  progress_label:       "Partially completed — 1 step finished",
  completed_nodes:      ["step_1"],
  validation_status:    "fail",
};

// ── Helper ────────────────────────────────────────────────────────────────────

function makeCompositeProps(
  onSubmit: CompositeAppRendererProps["onSubmit"]
): CompositeAppRendererProps {
  return {
    slug:           "ai-training-suite",
    title:          "AI Training Suite",
    inputContract:  INPUT_CONTRACT,
    outputContract: OUTPUT_CONTRACT,
    graphNodes:     GRAPH_NODES,
    onSubmit,
  };
}

// ── GraphStepper tests ────────────────────────────────────────────────────────

describe("GraphStepper", () => {
  it("renders all step chips", () => {
    render(<GraphStepper steps={THREE_STEPS} />);
    expect(screen.getByTestId("graph-stepper")).toBeTruthy();
    expect(screen.getByTestId("graph-step-step_1")).toBeTruthy();
    expect(screen.getByTestId("graph-step-step_2")).toBeTruthy();
    expect(screen.getByTestId("graph-step-step_3")).toBeTruthy();
  });

  it("renders step labels in aria-label attributes", () => {
    render(<GraphStepper steps={THREE_STEPS} />);
    expect(screen.getByTestId("graph-step-step_1").getAttribute("aria-label")).toContain("Prompt Improvement");
    expect(screen.getByTestId("graph-step-step_2").getAttribute("aria-label")).toContain("Rubric Evaluation");
    expect(screen.getByTestId("graph-step-step_3").getAttribute("aria-label")).toContain("Learner Feedback");
  });

  it("step data-status attribute matches status prop", () => {
    render(<GraphStepper steps={THREE_STEPS} />);
    expect(screen.getByTestId("graph-step-step_1").dataset["status"]).toBe("complete");
    expect(screen.getByTestId("graph-step-step_2").dataset["status"]).toBe("active");
    expect(screen.getByTestId("graph-step-step_3").dataset["status"]).toBe("pending");
  });

  it("renders progress label when provided", () => {
    render(
      <GraphStepper
        steps={THREE_STEPS}
        progressLabel="Completed 1 of 3 steps"
        runStatus="running"
      />
    );
    expect(screen.getByTestId("graph-stepper-progress-label")).toHaveTextContent(
      "Completed 1 of 3 steps"
    );
  });

  it("does NOT render progress label section when not provided", () => {
    render(<GraphStepper steps={THREE_STEPS} />);
    expect(screen.queryByTestId("graph-stepper-progress-label")).toBeNull();
  });

  it("renders correct aria-label for each step", () => {
    render(<GraphStepper steps={THREE_STEPS} />);
    const step1 = screen.getByTestId("graph-step-step_1");
    expect(step1.getAttribute("aria-label")).toContain("Prompt Improvement");
    expect(step1.getAttribute("aria-label")).toContain("complete");
  });

  it("role=list is present on track", () => {
    render(<GraphStepper steps={THREE_STEPS} />);
    expect(screen.getByRole("list")).toBeTruthy();
  });

  it("renders all-complete steps correctly", () => {
    render(<GraphStepper steps={ALL_COMPLETE_STEPS} runStatus="complete" />);
    for (const step of ALL_COMPLETE_STEPS) {
      expect(screen.getByTestId(`graph-step-${step.id}`).dataset["status"]).toBe("complete");
    }
  });

  it("renders failed step with failed data-status", () => {
    render(<GraphStepper steps={FAILED_STEPS} runStatus="error" />);
    expect(screen.getByTestId("graph-step-step_2").dataset["status"]).toBe("failed");
  });

  it("renders empty stepper without crashing", () => {
    const { container } = render(<GraphStepper steps={[]} />);
    expect(container.querySelector("[data-testid='graph-stepper']")).toBeTruthy();
  });
});

// ── CompositeAppRenderer tests ────────────────────────────────────────────────

describe("CompositeAppRenderer", () => {
  it("renders the input form", () => {
    const onSubmit = vi.fn();
    render(<CompositeAppRenderer {...makeCompositeProps(onSubmit)} />);
    expect(screen.getByTestId("dynamic-form")).toBeTruthy();
  });

  it("renders all graph nodes in the stepper on initial load", () => {
    const onSubmit = vi.fn();
    render(<CompositeAppRenderer {...makeCompositeProps(onSubmit)} />);
    // GraphStepper is shown since graphNodes.length > 0
    expect(screen.getByTestId("graph-stepper")).toBeTruthy();
    // Step labels appear inside aria-label attributes — verify via testId
    const step1 = screen.getByTestId("graph-step-step_1");
    const step2 = screen.getByTestId("graph-step-step_2");
    const step3 = screen.getByTestId("graph-step-step_3");
    expect(step1.getAttribute("aria-label")).toContain("Prompt Improvement");
    expect(step2.getAttribute("aria-label")).toContain("Rubric Evaluation");
    expect(step3.getAttribute("aria-label")).toContain("Learner Feedback");

  });

  it("all steps are pending before submission", () => {
    const onSubmit = vi.fn();
    render(<CompositeAppRenderer {...makeCompositeProps(onSubmit)} />);
    const steps = screen.getAllByRole("listitem");
    for (const step of steps) {
      expect(step.dataset["status"]).toBe("pending");
    }
  });

  it("output card is not shown before submission", () => {
    const onSubmit = vi.fn();
    render(<CompositeAppRenderer {...makeCompositeProps(onSubmit)} />);
    expect(screen.queryByTestId("output-card")).toBeNull();
  });

  it("calls onSubmit with form values when form is submitted", async () => {
    const onSubmit = vi.fn().mockResolvedValue(SUCCESS_RESULT);
    render(<CompositeAppRenderer {...makeCompositeProps(onSubmit)} />);

    // Fill required field
    const textarea = screen.getByTestId("field-original_prompt") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "My test prompt" } });

    // Submit form
    fireEvent.submit(screen.getByTestId("dynamic-form"));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      original_prompt: "My test prompt",
    }));
  });

  it("shows GraphStepper with 'Starting graph run' progress after submit", async () => {
    let resolveSubmit: (r: PublicGraphRunResult) => void;
    const onSubmit = vi.fn().mockReturnValue(new Promise<PublicGraphRunResult>((res) => {
      resolveSubmit = res;
    }));
    render(<CompositeAppRenderer {...makeCompositeProps(onSubmit)} />);

    const textarea = screen.getByTestId("field-original_prompt") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "My test prompt" } });
    fireEvent.submit(screen.getByTestId("dynamic-form"));

    await waitFor(() => {
      expect(screen.getByTestId("graph-stepper-progress-label"))
        .toHaveTextContent("Starting graph run");
    });

    // Clean up — resolve to prevent unhandled rejection
    await act(async () => { resolveSubmit(SUCCESS_RESULT); });
  });

  it("shows OutputCard with final_output after successful run", async () => {
    const onSubmit = vi.fn().mockResolvedValue(SUCCESS_RESULT);
    render(<CompositeAppRenderer {...makeCompositeProps(onSubmit)} />);

    const textarea = screen.getByTestId("field-original_prompt") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "My test prompt" } });
    fireEvent.submit(screen.getByTestId("dynamic-form"));

    await waitFor(() => {
      expect(screen.getByTestId("output-card")).toBeTruthy();
    });
    expect(screen.getByText("Great progress!")).toBeTruthy();
  });

  it("progress_label from API is shown in GraphStepper after run", async () => {
    const onSubmit = vi.fn().mockResolvedValue(SUCCESS_RESULT);
    render(<CompositeAppRenderer {...makeCompositeProps(onSubmit)} />);

    const textarea = screen.getByTestId("field-original_prompt") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "test" } });
    fireEvent.submit(screen.getByTestId("dynamic-form"));

    await waitFor(() => {
      expect(screen.getByTestId("graph-stepper-progress-label"))
        .toHaveTextContent("Completed 3 steps successfully");
    });
  });

  it("all steps are marked complete after a successful run", async () => {
    const onSubmit = vi.fn().mockResolvedValue(SUCCESS_RESULT);
    render(<CompositeAppRenderer {...makeCompositeProps(onSubmit)} />);

    const textarea = screen.getByTestId("field-original_prompt") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "test" } });
    fireEvent.submit(screen.getByTestId("dynamic-form"));

    await waitFor(() => {
      const steps = screen.getAllByRole("listitem");
      for (const step of steps) {
        expect(step.dataset["status"]).toBe("complete");
      }
    });
  });

  it("publicMode=true: internal_score is NOT rendered in OutputCard", async () => {
    const resultWithInternal: PublicGraphRunResult = {
      ...SUCCESS_RESULT,
      final_output: {
        learner_feedback: "Good job!",
        next_practice:    "Try X.",
        internal_score:   "95/100",  // not in public_fields → must be hidden
      },
    };
    const onSubmit = vi.fn().mockResolvedValue(resultWithInternal);
    render(<CompositeAppRenderer {...makeCompositeProps(onSubmit)} />);

    const textarea = screen.getByTestId("field-original_prompt") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "test" } });
    fireEvent.submit(screen.getByTestId("dynamic-form"));

    await waitFor(() => {
      expect(screen.getByTestId("output-card")).toBeTruthy();
    });

    // internal_score NOT in public_fields → should not appear
    expect(screen.queryByTestId("output-field-internal_score")).toBeNull();
    // public fields ARE shown
    expect(screen.getByTestId("output-field-learner_feedback")).toBeTruthy();
    expect(screen.getByTestId("output-field-next_practice")).toBeTruthy();
  });

  it("shows partial result banner on partial status", async () => {
    const onSubmit = vi.fn().mockResolvedValue(PARTIAL_RESULT);
    render(<CompositeAppRenderer {...makeCompositeProps(onSubmit)} />);

    const textarea = screen.getByTestId("field-original_prompt") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "test" } });
    fireEvent.submit(screen.getByTestId("dynamic-form"));

    await waitFor(() => {
      expect(screen.getByTestId("partial-result-banner")).toBeTruthy();
    });
  });

  it("shows error state in OutputCard when onSubmit throws", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("AI provider unavailable"));
    render(<CompositeAppRenderer {...makeCompositeProps(onSubmit)} />);

    const textarea = screen.getByTestId("field-original_prompt") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "test" } });
    fireEvent.submit(screen.getByTestId("dynamic-form"));

    await waitFor(() => {
      expect(screen.getByTestId("output-card")).toBeTruthy();
    });
    expect(screen.getByRole("alert")).toHaveTextContent("AI provider unavailable");
  });

  it("does NOT render partial banner on successful run", async () => {
    const onSubmit = vi.fn().mockResolvedValue(SUCCESS_RESULT);
    render(<CompositeAppRenderer {...makeCompositeProps(onSubmit)} />);

    const textarea = screen.getByTestId("field-original_prompt") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "test" } });
    fireEvent.submit(screen.getByTestId("dynamic-form"));

    await waitFor(() => {
      expect(screen.getByTestId("output-card")).toBeTruthy();
    });
    expect(screen.queryByTestId("partial-result-banner")).toBeNull();
  });

  it("required field validation still fires (empty form does not call onSubmit)", () => {
    const onSubmit = vi.fn();
    render(<CompositeAppRenderer {...makeCompositeProps(onSubmit)} />);
    fireEvent.submit(screen.getByTestId("dynamic-form"));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("required");
  });

  it("submit button is disabled while run is in flight", async () => {
    let resolve: (r: PublicGraphRunResult) => void;
    const onSubmit = vi.fn().mockReturnValue(
      new Promise<PublicGraphRunResult>((res) => { resolve = res; })
    );
    render(<CompositeAppRenderer {...makeCompositeProps(onSubmit)} />);

    const textarea = screen.getByTestId("field-original_prompt") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "test" } });
    fireEvent.submit(screen.getByTestId("dynamic-form"));

    await waitFor(() => {
      const btn = screen.getByTestId("submit-btn") as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    // Clean up
    await act(async () => { resolve(SUCCESS_RESULT); });
  });

  it("does not expose node_results or internal fields in the DOM", async () => {
    const resultWithInternal: PublicGraphRunResult = {
      ...SUCCESS_RESULT,
      final_output: {
        learner_feedback: "Good job!",
        execution_plan:   "SHOULD NOT APPEAR",
        taskflow_cx:      "SHOULD NOT APPEAR",
      },
    };
    const onSubmit = vi.fn().mockResolvedValue(resultWithInternal);
    render(<CompositeAppRenderer {...makeCompositeProps(onSubmit)} />);

    const textarea = screen.getByTestId("field-original_prompt") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "test" } });
    fireEvent.submit(screen.getByTestId("dynamic-form"));

    await waitFor(() => {
      expect(screen.getByTestId("output-card")).toBeTruthy();
    });

    // Forbidden field names should not appear in the DOM as output fields
    expect(screen.queryByTestId("output-field-execution_plan")).toBeNull();
    expect(screen.queryByTestId("output-field-taskflow_cx")).toBeNull();
  });
});
