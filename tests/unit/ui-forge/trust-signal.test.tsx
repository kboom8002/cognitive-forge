/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrustSignalPanel } from "../../../packages/ui-forge/src/output-renderer/TrustSignalPanel";
import { sanitizeTrustSignals } from "../../../packages/runtime/src/public/trust-sanitizer";
import { OutputCard } from "../../../packages/ui-forge/src/output-renderer/OutputCard";

describe("TrustSignalPanel UI & Sanitization", () => {
  const mockRawSignals = {
    validation_status: "pass" as const,
    completeness_score: 85,
    risk_notes: ["Source may be outdated"],
    missing_information: ["Author biography"],
    is_export_ready: true,
    _internal_report: { raw_errors: ["regex_fail_at_line_4"] } // Internal, should be stripped
  };

  it("T5: sanitizeTrustSignals strips internal details in public mode", () => {
    const sanitized = sanitizeTrustSignals(mockRawSignals);
    expect(sanitized.validation_status).toBe("pass");
    expect(sanitized.completeness_score).toBe(85);
    expect((sanitized as any)._internal_report).toBeUndefined();
  });

  it("T1: TrustSignalPanel correctly displays validation status", () => {
    render(<TrustSignalPanel signals={sanitizeTrustSignals(mockRawSignals)} publicMode={true} />);
    expect(screen.getByText("pass")).toBeDefined();
    // TrustSignalPanel should render a copy/export readiness status if is_export_ready=true
    expect(screen.getByText("Ready for Export")).toBeDefined();
  });

  it("T2 & T3: Renders risk_notes and missing_information when present", () => {
    render(<TrustSignalPanel signals={sanitizeTrustSignals(mockRawSignals)} publicMode={true} />);
    expect(screen.getByText("Source may be outdated")).toBeDefined();
    expect(screen.getByText("Author biography")).toBeDefined();
  });

  it("T4: Displays completeness score", () => {
    render(<TrustSignalPanel signals={sanitizeTrustSignals(mockRawSignals)} publicMode={true} />);
    expect(screen.getByText("85% Complete")).toBeDefined();
  });

  it("T6: Builder mode shows richer validation report", () => {
    const { container } = render(
      <TrustSignalPanel signals={mockRawSignals as any} publicMode={false} />
    );
    // Should render internal report
    expect(screen.getByText(/regex_fail_at_line_4/i)).toBeDefined();
  });

  it("T7: OutputCard integrates TrustSignalPanel seamlessly", () => {
    const { container } = render(
      <OutputCard 
        outputContract={{ fields: [{ key: "test_field", type: "string" } as any] }} 
        values={{ test_field: "test" }} 
        status="complete" 
        publicMode={true}
        trustSignals={sanitizeTrustSignals(mockRawSignals)}
      />
    );
    // TrustSignalPanel text should appear inside OutputCard
    expect(screen.getByText("85% Complete")).toBeDefined();
  });
});
