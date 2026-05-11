// @vitest-environment jsdom
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AITrainingOutputPackage } from "../../../apps/web/components/public-app/AITrainingOutputPackage";

const mockOutput = {
  diagnosis: "Weakness 1...",
  improved_prompt: "You are an expert...",
  improvement_explanation: "What changed and why...",
  rubric_evaluation: "Prompt Rubric Evaluation...\n1. Clarity: 5/5...",
  quality_checklist: "1. Role...",
  learner_feedback: "Strong work on this...",
  next_practice: "Task: Take your prompt..."
};

describe("AITrainingOutputPackage", () => {
  it("renders tabs for Practice, Rubric, and Feedback", () => {
    render(<AITrainingOutputPackage status="complete" finalOutput={mockOutput} />);
    
    expect(screen.getByRole("tab", { name: /improved prompt/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /rubric evaluation/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /coaching feedback/i })).toBeInTheDocument();
  });

  it("copy button exists for improved prompt", () => {
    render(<AITrainingOutputPackage status="complete" finalOutput={mockOutput} />);
    expect(screen.getByTestId("copy-improved-prompt")).toBeInTheDocument();
  });

  it("renders rubric score visually if parseable, or just the text", () => {
    render(<AITrainingOutputPackage status="complete" finalOutput={mockOutput} />);
    fireEvent.click(screen.getByRole("tab", { name: /rubric evaluation/i }));
    expect(screen.getByText(/Prompt Rubric Evaluation/)).toBeInTheDocument();
  });

  it("no raw JSON appears in public mode", () => {
    const { container } = render(<AITrainingOutputPackage status="complete" finalOutput={mockOutput} />);
    expect(container.textContent).not.toMatch(/\{.*\}/);
    expect(container.textContent).not.toContain('JSON.stringify');
  });

  it("tabs switch content", () => {
    render(<AITrainingOutputPackage status="complete" finalOutput={mockOutput} />);
    
    // Initially on Improved Prompt tab
    expect(screen.getByText(/What changed and why/)).toBeVisible();
    expect(screen.queryByText(/Prompt Rubric Evaluation/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /rubric evaluation/i }));
    expect(screen.getByText(/Prompt Rubric Evaluation/)).toBeVisible();
    expect(screen.queryByText(/What changed and why/)).not.toBeInTheDocument();
  });
});
