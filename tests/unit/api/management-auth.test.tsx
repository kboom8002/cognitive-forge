// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { requireManagementAuth } from "../../../apps/web/lib/api/auth";
import { BookToAgentOutputPackage } from "../../../apps/web/components/public-app/BookToAgentOutputPackage";

describe("requireManagementAuth & BookToAgentOutputPackage", () => {
  const origKey = process.env.ADMIN_API_KEY;

  afterEach(() => {
    if (origKey === undefined) {
      delete process.env.ADMIN_API_KEY;
    } else {
      process.env.ADMIN_API_KEY = origKey;
    }
  });

  it("rejects missing Authorization header when auth is enforced", async () => {
    process.env.ADMIN_API_KEY = "test-admin-secret";

    const req = new Request("http://localhost/api/casepacks", { method: "GET" });
    await expect(requireManagementAuth(req)).rejects.toThrow(/Authentication required/i);
  });

  it("accepts matching ADMIN_API_KEY Bearer token", async () => {
    process.env.ADMIN_API_KEY = "test-admin-secret";

    const req = new Request("http://localhost/api/casepacks", {
      method: "GET",
      headers: { Authorization: "Bearer test-admin-secret" },
    });
    const ctx = await requireManagementAuth(req);
    expect(ctx.type).toBe("admin");
  });

  it("renders BookToAgentOutputPackage tabs and Download Package button", () => {
    render(
      <BookToAgentOutputPackage
        finalOutput={{
          book_knowledge_summary: "Knowledge can be compiled into contract-driven agents.",
          insight_qa: "Q: What is a CasePack? A: A contract-driven cognitive unit.",
          personalized_interpretation: "Apply this to your domain.",
          action_plan: "1. Define input contract\n2. Define output contract",
          next_steps: "Run fixture validation.",
          reflection_questions: "Which domain workflows can be formalized?",
          risk_notes: "Avoid raw prompt dumps.",
        }}
        status="complete"
      />
    );

    expect(screen.getByTestId("book-to-agent-output-package")).toBeDefined();
    expect(screen.getByTestId("download-book-package")).toBeDefined();
    expect(screen.getAllByText(/Knowledge Summary/i).length).toBeGreaterThan(0);
  });
});
