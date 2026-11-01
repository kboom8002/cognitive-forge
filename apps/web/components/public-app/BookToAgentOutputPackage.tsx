"use client";

import React, { useState } from "react";
import type { CompositeRunState, OutputValue } from "@cognitive-forge/ui-forge";

interface BookToAgentOutputPackageProps {
  status: CompositeRunState;
  finalOutput: Record<string, OutputValue>;
  errorMessage?: string;
}

const TABS = [
  { id: "knowledge", label: "Knowledge Summary" },
  { id: "insight", label: "Insight Q&A" },
  { id: "action", label: "Action Plan" },
  { id: "reflection", label: "Reflection & Risks" },
] as const;

export function BookToAgentOutputPackage({
  status,
  finalOutput,
  errorMessage,
}: BookToAgentOutputPackageProps) {
  const [activeTab, setActiveTab] = useState<string>("knowledge");
  const [downloaded, setDownloaded] = useState(false);

  if (status === "idle" || status === "running") {
    return null;
  }

  if (errorMessage) {
    return (
      <div style={{ color: "var(--color-forge-error)", padding: "1rem", background: "var(--color-forge-700)" }}>
        {errorMessage}
      </div>
    );
  }

  const str = (key: string) => (finalOutput[key] as string) || "";

  const handleCopy = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
  };

  const handleDownloadPackage = () => {
    const md = [
      "# Book-to-Agent Knowledge Package",
      `## Knowledge Summary\n\n${str("book_knowledge_summary")}`,
      `## Insight Q&A\n\n${str("insight_qa")}`,
      `## Personalised Interpretation\n\n${str("personalized_interpretation")}`,
      `## Action Plan\n\n${str("action_plan")}`,
      `## Next Steps\n\n${str("next_steps")}`,
      `## Reflection Questions\n\n${str("reflection_questions")}`,
      `## Risk Notes\n\n${str("risk_notes")}`,
    ].join("\n\n---\n\n");

    if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
      const blob = new Blob([md], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "book_to_agent_package.md";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <div
      data-testid="book-to-agent-output-package"
      style={{ background: "var(--color-forge-800)", borderRadius: "0.5rem", overflow: "hidden", marginTop: "2rem" }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1.5rem",
          borderBottom: "1px solid var(--color-forge-border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.25rem", color: "var(--color-forge-text)" }}>
          Book-to-Agent Knowledge Package
        </h2>
        <button
          data-testid="download-book-package"
          type="button"
          onClick={handleDownloadPackage}
          style={{
            padding: "0.5rem 1rem",
            background: "rgba(52, 211, 153, 0.15)",
            color: "#34d399",
            border: "1px solid rgba(52, 211, 153, 0.35)",
            borderRadius: "0.25rem",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.875rem",
          }}
        >
          {downloaded ? "Downloaded!" : "Download Package"}
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          overflowX: "auto",
          borderBottom: "1px solid var(--color-forge-border)",
          background: "var(--color-forge-900)",
        }}
        role="tablist"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "1rem 1.5rem",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === tab.id ? "2px solid #34d399" : "2px solid transparent",
              color: activeTab === tab.id ? "var(--color-forge-text)" : "var(--color-forge-muted)",
              cursor: "pointer",
              fontWeight: activeTab === tab.id ? 600 : 400,
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div style={{ padding: "1.5rem" }}>
        {activeTab === "knowledge" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, color: "#34d399" }}>Structured Knowledge Summary</h3>
              <button
                data-testid="copy-knowledge-summary"
                type="button"
                onClick={() => handleCopy(str("book_knowledge_summary"))}
                style={{
                  padding: "0.25rem 0.75rem",
                  background: "var(--color-forge-accent)",
                  color: "white",
                  border: "none",
                  borderRadius: "0.25rem",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                Copy Summary
              </button>
            </div>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0, color: "var(--color-forge-text)", lineHeight: 1.6 }}>
              {str("book_knowledge_summary")}
            </pre>
          </div>
        )}

        {activeTab === "insight" && (
          <div>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--color-forge-accent)" }}>Insight Q&A</h3>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: "0 0 1.5rem 0", color: "var(--color-forge-text)", lineHeight: 1.6 }}>
              {str("insight_qa")}
            </pre>
            {str("personalized_interpretation") && (
              <div style={{ padding: "1rem", background: "rgba(108, 99, 255, 0.1)", border: "1px solid rgba(108, 99, 255, 0.2)", borderRadius: "0.5rem" }}>
                <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--color-forge-accent)", fontSize: "1rem" }}>
                  💡 Personalised Interpretation
                </h3>
                <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0, color: "var(--color-forge-text)", lineHeight: 1.6 }}>
                  {str("personalized_interpretation")}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === "action" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, color: "#34d399" }}>Action Plan</h3>
              <button
                data-testid="copy-action-plan"
                type="button"
                onClick={() => handleCopy(str("action_plan"))}
                style={{
                  padding: "0.25rem 0.75rem",
                  background: "var(--color-forge-accent)",
                  color: "white",
                  border: "none",
                  borderRadius: "0.25rem",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                Copy Action Plan
              </button>
            </div>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: "0 0 1.5rem 0", color: "var(--color-forge-text)", lineHeight: 1.6 }}>
              {str("action_plan")}
            </pre>
            {str("next_steps") && (
              <div style={{ padding: "1rem", background: "rgba(52, 211, 153, 0.1)", border: "1px solid rgba(52, 211, 153, 0.2)", borderRadius: "0.5rem" }}>
                <h3 style={{ margin: "0 0 0.5rem 0", color: "#34d399", fontSize: "1rem" }}>🚀 Immediate Next Steps</h3>
                <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0, color: "var(--color-forge-text)", lineHeight: 1.6 }}>
                  {str("next_steps")}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === "reflection" && (
          <div>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#fbbf24" }}>Reflection Questions</h3>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: "0 0 1.5rem 0", color: "var(--color-forge-text)", lineHeight: 1.6 }}>
              {str("reflection_questions")}
            </pre>
            {str("risk_notes") && (
              <div
                data-testid="book-risk-notes-card"
                style={{
                  padding: "1rem",
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  borderRadius: "0.5rem",
                  color: "#f87171",
                }}
              >
                <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem" }}>⚠️ Application Risk Notes</h3>
                <p style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.5 }}>{str("risk_notes")}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
