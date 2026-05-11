// @vitest-environment jsdom
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PROutputPackage } from "../../../apps/web/components/public-app/PROutputPackage";

const mockOutput = {
  brand_positioning_statement: "Acme AI...",
  answer_card: "Q: What does Acme AI Solutions do?\nA: It helps...",
  press_release: "FOR IMMEDIATE RELEASE...",
  company_profile: "Acme AI Solutions is...",
  web_brochure: "HERO SECTION...",
  consistency_audit: "Tone Consistency: All materials...",
  risk_notes: "The '10-minute' speed claim...",
  audit_score: "Pass with minor notes"
};

describe("PROutputPackage", () => {
  it("renders all 6 output sections as tabs", () => {
    render(<PROutputPackage status="complete" finalOutput={mockOutput} />);
    
    expect(screen.getByRole("tab", { name: /brand positioning/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /answer card/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /press release/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /company profile/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /web brochure/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /consistency audit/i })).toBeInTheDocument();
  });

  it("renders consistency score display", () => {
    render(<PROutputPackage status="complete" finalOutput={mockOutput} />);
    expect(screen.getByText("Pass with minor notes")).toBeInTheDocument();
  });

  it("copy button exists for press_release", () => {
    render(<PROutputPackage status="complete" finalOutput={mockOutput} />);
    fireEvent.click(screen.getByRole("tab", { name: /press release/i }));
    expect(screen.getByTestId("copy-press-release")).toBeInTheDocument();
  });

  it("copy button exists for web_brochure", () => {
    render(<PROutputPackage status="complete" finalOutput={mockOutput} />);
    fireEvent.click(screen.getByRole("tab", { name: /web brochure/i }));
    expect(screen.getByTestId("copy-web-brochure")).toBeInTheDocument();
  });

  it("download/copy package button exists or placeholder is disabled with explanation", () => {
    render(<PROutputPackage status="complete" finalOutput={mockOutput} />);
    const downloadBtn = screen.getByTestId("download-pr-package");
    expect(downloadBtn).toBeInTheDocument();
  });

  it("no raw JSON appears in public mode", () => {
    const { container } = render(<PROutputPackage status="complete" finalOutput={mockOutput} />);
    expect(container.textContent).not.toMatch(/\{.*\}/);
    expect(container.textContent).not.toContain('JSON.stringify');
  });

  it("risk notes rendered in a styled warning card", () => {
    render(<PROutputPackage status="complete" finalOutput={mockOutput} />);
    fireEvent.click(screen.getByRole("tab", { name: /consistency audit/i }));
    expect(screen.getByTestId("risk-notes-card")).toBeInTheDocument();
    expect(screen.getByText(/The '10-minute' speed claim/)).toBeInTheDocument();
  });

  it("section tabs switch content", () => {
    render(<PROutputPackage status="complete" finalOutput={mockOutput} />);
    
    fireEvent.click(screen.getByRole("tab", { name: /press release/i }));
    expect(screen.getByText(/FOR IMMEDIATE RELEASE/)).toBeVisible();
    expect(screen.queryByText(/HERO SECTION/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /web brochure/i }));
    expect(screen.getByText(/HERO SECTION/)).toBeVisible();
    expect(screen.queryByText(/FOR IMMEDIATE RELEASE/)).not.toBeInTheDocument();
  });
});
