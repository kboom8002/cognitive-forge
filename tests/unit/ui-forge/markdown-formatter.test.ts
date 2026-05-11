import { describe, it, expect } from "vitest";
import { formatToMarkdown } from "../../../packages/ui-forge/src/utils/markdown-formatter";

describe("Markdown Formatter", () => {
  it("T1: Formats flat key-value object to human-readable Markdown", () => {
    const data = {
      title: "Press Release",
      author: "Jane Doe",
      score: 95
    };
    const markdown = formatToMarkdown(data);
    expect(markdown).toContain("**Title**: Press Release");
    expect(markdown).toContain("**Author**: Jane Doe");
    expect(markdown).toContain("**Score**: 95");
  });

  it("T2: Formats array strings to Markdown bullet points", () => {
    const data = {
      highlights: ["Point 1", "Point 2", "Point 3"]
    };
    const markdown = formatToMarkdown(data);
    expect(markdown).toContain("**Highlights**:");
    expect(markdown).toContain("- Point 1");
    expect(markdown).toContain("- Point 2");
    expect(markdown).toContain("- Point 3");
  });

  it("T3: Handles nested objects gracefully by stringifying them", () => {
    const data = {
      metadata: { created_at: "2026-05-11", version: 1 }
    };
    const markdown = formatToMarkdown(data);
    expect(markdown).toContain("**Metadata**:");
    expect(markdown).toContain('"created_at": "2026-05-11"');
  });

  it("Handles missing values gracefully", () => {
    const data = {
      title: null,
      description: undefined,
      empty: ""
    };
    const markdown = formatToMarkdown(data);
    // null/undefined usually aren't rendered or rendered as empty. Let's say we render them as empty strings or skip them.
    expect(markdown).toContain("**Title**:");
    expect(markdown).toContain("**Empty**:");
  });
});
