/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PackGalleryLite } from "../../../apps/web/components/public-app/PackGalleryLite";
import { sanitizePackManifest } from "../../../packages/domain-packs/src/public-pack-sanitizer";
import type { DomainPackManifest } from "@cognitive-forge/core";

describe("PackGalleryLite UI & Sanitization", () => {
  const MOCK_MANIFESTS: DomainPackManifest[] = [
    {
      key: "pack.corporate-pr.v1",
      version: "1.0.0",
      status: "production",
      primary_app_slug: "corporate-pr-suite",
      assets: {
        apps: [{ slug: "corporate-pr-suite", graph_key: "graph.corporate_pr_suite.v1", title: "Corporate PR Suite" }],
        casepacks: ["cp.company_intake.v1"]
      },
      metadata: {
        title: "Corporate PR Turnkey Pack",
        description: "Transform your company details into a full PR kit.",
        tags: ["Corporate Communications"]
      }
    },
    {
      key: "pack.book-to-agent.v1",
      version: "1.0.0",
      status: "production",
      primary_app_slug: "book-to-agent",
      assets: {
        apps: [{ slug: "book-to-agent", graph_key: "graph.book_to_agent.v1", title: "Book to Agent" }],
        casepacks: ["cp.book.intake.v1"]
      },
      metadata: {
        title: "Book-to-Agent Pack",
        description: "Transform any non-fiction book into a personalised AI knowledge agent.",
        tags: ["Learning & Knowledge"]
      }
    },
    {
      key: "pack.ai-training.v1",
      version: "1.0.0",
      status: "production",
      primary_app_slug: "ai-training-practice-suite",
      assets: {
        apps: [{ slug: "ai-training-practice-suite", graph_key: "graph.practice_to_feedback.v1", title: "AI Training" }],
        casepacks: ["cp.prompt.improvement.practice.v1"]
      },
      metadata: {
        title: "AI Training Practice Pack",
        description: "A complete 3-step AI training session.",
        tags: ["AI Training & Education"]
      }
    }
  ];

  it("T5: sanitizePackManifest strips internal details", () => {
    const raw = MOCK_MANIFESTS[0];
    const sanitized = sanitizePackManifest(raw);
    
    // Check included fields
    expect(sanitized.name).toBe("Corporate PR Turnkey Pack");
    expect(sanitized.description).toBe("Transform your company details into a full PR kit.");
    expect(sanitized.domain).toBe("Corporate Communications");
    expect(sanitized.primary_app_slug).toBe("corporate-pr-suite");
    expect(sanitized.status).toBe("production");
    
    // Check stripped fields
    const rawJson = JSON.stringify(sanitized);
    expect(rawJson).not.toContain("assets");
    expect(rawJson).not.toContain("cp.company_intake.v1");
    expect(rawJson).not.toContain("graph.corporate_pr_suite.v1");
  });

  it("T1 & T2: renders PackGalleryLite with all 3 required packs", () => {
    const summaries = MOCK_MANIFESTS.map(sanitizePackManifest);
    render(<PackGalleryLite packs={summaries} />);
    
    expect(screen.getByText("Corporate PR Turnkey Pack")).toBeDefined();
    expect(screen.getByText("Book-to-Agent Pack")).toBeDefined();
    expect(screen.getByText("AI Training Practice Pack")).toBeDefined();
  });

  it("T3: each pack shows name, description, domain, status", () => {
    const summaries = [sanitizePackManifest(MOCK_MANIFESTS[0])];
    render(<PackGalleryLite packs={summaries} />);
    
    expect(screen.getByText("Corporate PR Turnkey Pack")).toBeDefined();
    expect(screen.getByText("Transform your company details into a full PR kit.")).toBeDefined();
    expect(screen.getByText("Corporate Communications")).toBeDefined(); // domain tag
    expect(screen.getByText("production")).toBeDefined(); // status badge
  });

  it("T4: primary app link navigates correctly", () => {
    const summaries = [sanitizePackManifest(MOCK_MANIFESTS[0])];
    render(<PackGalleryLite packs={summaries} />);
    
    const link = screen.getByRole("link", { name: /Launch App/i });
    expect(link.getAttribute("href")).toBe("/a/corporate-pr-suite");
  });
});
