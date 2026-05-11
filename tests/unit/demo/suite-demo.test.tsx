// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";

import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { DEMO_SUITES, getDemoSuite } from "../../../apps/web/app/demo/_lib/demo-registry";
import { SuiteSelector } from "../../../apps/web/components/demo/SuiteSelector";
import { SuiteDemoClient } from "../../../apps/web/components/demo/SuiteDemoClient";
import { FORBIDDEN_PUBLIC_KEYS } from "@cognitive-forge/validation";

// ── Recursive forbidden-key scanner ───────────────────────────────────────────
function deepScanForForbiddenKeys(obj: any, path = "root"): { path: string; key: string }[] {
  const leaks: { path: string; key: string }[] = [];
  if (obj === null || typeof obj !== "object") return leaks;

  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      leaks.push(...deepScanForForbiddenKeys(item, `${path}[${idx}]`));
    });
    return leaks;
  }

  for (const [key, value] of Object.entries(obj)) {
    if (FORBIDDEN_PUBLIC_KEYS.includes(key)) {
      leaks.push({ path: `${path}.${key}`, key });
    }
    leaks.push(...deepScanForForbiddenKeys(value, `${path}.${key}`));
  }
  return leaks;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 1 — Static Mode (existing, preserved)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Suite Demo Static Mode", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("Data Verification", () => {
    it("has exactly 3 Demo Suites", () => {
      expect(DEMO_SUITES.length).toBe(3);
    });

    it("has correct CasePack counts (nodes length) for each Suite", () => {
      const pr = getDemoSuite("corporate-pr-suite");
      const book = getDemoSuite("book-to-agent");
      const practice = getDemoSuite("ai-training-practice-suite");

      expect(pr?.nodes.length).toBe(7);
      expect(book?.nodes.length).toBe(5);
      expect(practice?.nodes.length).toBe(3);
    });

    it("does not contain any forbidden internal keys in sampleOutput", () => {
      for (const suite of DEMO_SUITES) {
        const leaks = deepScanForForbiddenKeys(suite.sampleOutput);
        expect(leaks).toEqual([]);
      }
    });
  });

  describe("SuiteSelector", () => {
    it("renders three Suite cards", () => {
      render(<SuiteSelector suites={DEMO_SUITES} />);

      const links = screen.getAllByRole("link");
      expect(links.length).toBe(3);

      expect(screen.getByText("Corporate PR Turnkey Suite")).toBeTruthy();
      expect(screen.getByText("Book-to-Agent Suite")).toBeTruthy();
      expect(screen.getByText("AI Training Practice Suite")).toBeTruthy();
    });
  });

  describe("SuiteDemoClient interactions", () => {
    it("completes static walkthrough without backend", async () => {
      const suite = getDemoSuite("ai-training-practice-suite")!;
      render(<SuiteDemoClient suite={suite} />);

      expect(screen.queryByText(/Diagnosis/)).toBeNull();

      const runBtn = screen.getByRole("button", { name: /Run static demo/i });
      fireEvent.click(runBtn);

      act(() => {
        vi.advanceTimersByTime(300 + (suite.nodes.length + 1) * 600 + 100);
      });

      expect(screen.getByRole("button", { name: /Demo complete/i })).toBeTruthy();
      expect(screen.getByText("Diagnosis")).toBeTruthy();
      expect(screen.getByText(/Weakness 1 — No specificity of scope/)).toBeTruthy();
    });

    it("resets state when Reset button is clicked", () => {
      const suite = getDemoSuite("ai-training-practice-suite")!;
      render(<SuiteDemoClient suite={suite} />);

      const runBtn = screen.getByRole("button", { name: /Run static demo/i });
      fireEvent.click(runBtn);

      act(() => {
        vi.advanceTimersByTime(300 + (suite.nodes.length + 1) * 600 + 100);
      });

      const resetBtn = screen.getByRole("button", { name: /Reset/i });
      fireEvent.click(resetBtn);

      expect(screen.getByRole("button", { name: /Run static demo/i })).toBeTruthy();
      expect(screen.queryByText(/Weakness 1 — No specificity of scope/)).toBeNull();
    });

    it("static mode does not call fetch", () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      const suite = getDemoSuite("ai-training-practice-suite")!;
      render(<SuiteDemoClient suite={suite} />);

      const runBtn = screen.getByRole("button", { name: /Run static demo/i });
      fireEvent.click(runBtn);

      act(() => {
        vi.advanceTimersByTime(300 + (suite.nodes.length + 1) * 600 + 100);
      });

      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 2 — Live Runtime Mode
// ═══════════════════════════════════════════════════════════════════════════════

describe("Suite Demo Live Runtime Mode", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("mode toggle renders both Static and Live buttons", () => {
    const suite = getDemoSuite("ai-training-practice-suite")!;
    render(<SuiteDemoClient suite={suite} />);

    expect(screen.getByText("Static Demo")).toBeTruthy();
    expect(screen.getByText("Live Runtime")).toBeTruthy();
  });

  it("Live button is clickable and toggles mode", () => {
    const suite = getDemoSuite("ai-training-practice-suite")!;
    render(<SuiteDemoClient suite={suite} />);

    const liveBtn = screen.getByText("Live Runtime").closest("button")!;
    expect(liveBtn.disabled).toBe(false);

    fireEvent.click(liveBtn);

    // After clicking Live, the Run button label should change
    expect(screen.getByRole("button", { name: /Run live/i })).toBeTruthy();
  });

  it("live mode calls correct graph-run endpoint for Corporate PR", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { status: "success", final_output: { tagline: "Test" } } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const suite = getDemoSuite("corporate-pr-suite")!;
    render(<SuiteDemoClient suite={suite} />);

    // Switch to live
    fireEvent.click(screen.getByText("Live Runtime").closest("button")!);

    // Click run
    fireEvent.click(screen.getByRole("button", { name: /Run live/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/public/apps/corporate-pr-suite/graph-run",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("live mode calls correct graph-run endpoint for Book-to-Agent", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { status: "success", final_output: { insight_qa: "Test" } } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const suite = getDemoSuite("book-to-agent")!;
    render(<SuiteDemoClient suite={suite} />);

    fireEvent.click(screen.getByText("Live Runtime").closest("button")!);
    fireEvent.click(screen.getByRole("button", { name: /Run live/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/public/apps/book-to-agent/graph-run",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("live mode shows loading state during fetch", async () => {
    let resolveResponse!: (value: Response) => void;
    fetchSpy.mockReturnValueOnce(
      new Promise<Response>((resolve) => { resolveResponse = resolve; }),
    );

    const suite = getDemoSuite("ai-training-practice-suite")!;
    render(<SuiteDemoClient suite={suite} />);

    fireEvent.click(screen.getByText("Live Runtime").closest("button")!);
    fireEvent.click(screen.getByRole("button", { name: /Run live/i }));

    // Loading banner (role="status") should be visible
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toMatch(/Running live runtime/i);

    // Resolve to clean up
    resolveResponse(
      new Response(JSON.stringify({ data: { status: "success", final_output: {} } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await waitFor(() => {
      expect(screen.queryByRole("status")).toBeNull();
    });
  });

  it("live mode shows error state on fetch failure with fallback message", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("Network error"));

    const suite = getDemoSuite("ai-training-practice-suite")!;
    render(<SuiteDemoClient suite={suite} />);

    fireEvent.click(screen.getByText("Live Runtime").closest("button")!);
    fireEvent.click(screen.getByRole("button", { name: /Run live/i }));

    await waitFor(() => {
      expect(screen.getByText(/Live runtime unavailable/i)).toBeTruthy();
    });
  });

  it("live mode renders completed output from API response", async () => {
    const liveOutput = {
      diagnosis: "Live diagnosis result",
      improved_prompt: "Live improved prompt",
    };

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { status: "success", final_output: liveOutput } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const suite = getDemoSuite("ai-training-practice-suite")!;
    render(<SuiteDemoClient suite={suite} />);

    fireEvent.click(screen.getByText("Live Runtime").closest("button")!);
    fireEvent.click(screen.getByRole("button", { name: /Run live/i }));

    await waitFor(() => {
      expect(screen.getByText("Live diagnosis result")).toBeTruthy();
      expect(screen.getByText("Live improved prompt")).toBeTruthy();
    });
  });

  it("live mode responses do not contain forbidden keys", async () => {
    const liveOutput = {
      diagnosis: "Clean result",
      trace_payload: "SHOULD_BE_STRIPPED",
      nested: { execution_plan: "SHOULD_BE_STRIPPED" },
    };

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { status: "success", final_output: liveOutput } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const suite = getDemoSuite("ai-training-practice-suite")!;
    render(<SuiteDemoClient suite={suite} />);

    fireEvent.click(screen.getByText("Live Runtime").closest("button")!);
    fireEvent.click(screen.getByRole("button", { name: /Run live/i }));

    await waitFor(() => {
      expect(screen.getByText("Clean result")).toBeTruthy();
    });

    // The forbidden keys must NOT appear anywhere in the DOM
    expect(screen.queryByText("SHOULD_BE_STRIPPED")).toBeNull();
  });
});
