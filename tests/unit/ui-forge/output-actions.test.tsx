/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OutputActions } from "../../../packages/ui-forge/src/output-renderer/OutputActions";

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn();
global.URL.revokeObjectURL = vi.fn();

describe("OutputActions UI", () => {
  const mockData = {
    title: "Test Section",
    content: "Some generated text"
  };

  it("T4: UI renders Copy and Download Markdown buttons in publicMode", () => {
    render(<OutputActions data={mockData} publicMode={true} sectionName="Test" />);
    
    expect(screen.getByRole("button", { name: /Copy Section/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Download Markdown/i })).toBeDefined();
  });

  it("T5: JSON download is strictly hidden when publicMode is true", () => {
    render(<OutputActions data={mockData} publicMode={true} sectionName="Test" />);
    
    const jsonBtn = screen.queryByRole("button", { name: /Download JSON/i });
    expect(jsonBtn).toBeNull();
  });

  it("T6: JSON download is visible when publicMode is false", () => {
    render(<OutputActions data={mockData} publicMode={false} sectionName="Test" />);
    
    expect(screen.getByRole("button", { name: /Download JSON/i })).toBeDefined();
  });

  it("T7: Export Full Package renders as a placeholder if isSuite=true", () => {
    render(<OutputActions data={mockData} publicMode={true} isSuite={true} sectionName="Suite" />);
    
    expect(screen.getByRole("button", { name: /Copy All/i })).toBeDefined();
    const exportBtn = screen.getByRole("button", { name: /Export Package/i });
    expect(exportBtn).toBeDefined();
    
    // Clicking placeholder might show an alert or just be disabled, let's assume it's disabled or works as a placeholder
  });

});
