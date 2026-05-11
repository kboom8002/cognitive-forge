"use client";

import React, { useState } from "react";
import type { CompositeRunState } from "@cognitive-forge/ui-forge";
import type { OutputValue } from "@cognitive-forge/ui-forge";

interface AITrainingOutputPackageProps {
  status: CompositeRunState;
  finalOutput: Record<string, OutputValue>;
  errorMessage?: string;
}

const TABS = [
  { id: "prompt", label: "Improved Prompt" },
  { id: "rubric", label: "Rubric Evaluation" },
  { id: "feedback", label: "Coaching Feedback" },
];

const DEFAULT_TAB = "prompt";

export function AITrainingOutputPackage({ status, finalOutput, errorMessage }: AITrainingOutputPackageProps) {
  const [activeTab, setActiveTab] = useState(DEFAULT_TAB);

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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const str = (key: string) => (finalOutput[key] as string) || "";

  return (
    <div style={{ background: "var(--color-forge-800)", borderRadius: "0.5rem", overflow: "hidden", marginTop: "2rem" }}>
      {/* Header */}
      <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--color-forge-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: "1.25rem", color: "var(--color-forge-text)" }}>AI Training Results</h2>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", overflowX: "auto", borderBottom: "1px solid var(--color-forge-border)", background: "var(--color-forge-900)" }} role="tablist">
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
              borderBottom: activeTab === tab.id ? "2px solid var(--color-forge-accent)" : "2px solid transparent",
              color: activeTab === tab.id ? "var(--color-forge-text)" : "var(--color-forge-muted)",
              cursor: "pointer",
              fontWeight: activeTab === tab.id ? 600 : 400,
              whiteSpace: "nowrap"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div style={{ padding: "1.5rem" }}>
        {/* Tab 1: Improved Prompt */}
        {activeTab === "prompt" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, color: "var(--color-forge-accent)" }}>Your Improved Prompt</h3>
              <button
                data-testid="copy-improved-prompt"
                onClick={() => handleCopy(str("improved_prompt"))}
                style={{ padding: "0.25rem 0.75rem", background: "var(--color-forge-accent)", color: "white", border: "none", borderRadius: "0.25rem", cursor: "pointer", fontSize: "0.875rem" }}
              >
                Copy Prompt
              </button>
            </div>
            <div style={{ background: "var(--color-forge-900)", padding: "1rem", borderRadius: "0.25rem", marginBottom: "1.5rem" }}>
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0, color: "var(--color-forge-text)", lineHeight: 1.6 }}>
                {str("improved_prompt")}
              </pre>
            </div>
            
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#fbbf24" }}>Diagnosis</h3>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: "0 0 1.5rem 0", color: "var(--color-forge-muted)", lineHeight: 1.6 }}>
              {str("diagnosis")}
            </pre>

            <h3 style={{ margin: "0 0 0.5rem 0", color: "#34d399" }}>What Changed & Why</h3>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0, color: "var(--color-forge-muted)", lineHeight: 1.6 }}>
              {str("improvement_explanation")}
            </pre>
          </div>
        )}

        {/* Tab 2: Rubric Evaluation */}
        {activeTab === "rubric" && (
          <div>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--color-forge-accent)" }}>Evaluation Score</h3>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: "0 0 1.5rem 0", color: "var(--color-forge-text)", lineHeight: 1.6 }}>
              {str("rubric_evaluation")}
            </pre>

            <div style={{ padding: "1rem", background: "rgba(52, 211, 153, 0.1)", border: "1px solid rgba(52, 211, 153, 0.2)", borderRadius: "0.5rem" }}>
              <h3 style={{ margin: "0 0 0.5rem 0", color: "#34d399", fontSize: "1rem" }}>✅ Quality Checklist</h3>
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0, color: "var(--color-forge-text)", lineHeight: 1.6 }}>
                {str("quality_checklist")}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 3: Coaching Feedback */}
        {activeTab === "feedback" && (
          <div>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--color-forge-accent)" }}>Coach's Notes</h3>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: "0 0 1.5rem 0", color: "var(--color-forge-text)", lineHeight: 1.6 }}>
              {str("learner_feedback")}
            </pre>

            <div style={{ padding: "1rem", background: "rgba(108, 99, 255, 0.1)", border: "1px solid rgba(108, 99, 255, 0.2)", borderRadius: "0.5rem" }}>
              <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--color-forge-accent)", fontSize: "1rem" }}>🎯 Next Practice Challenge</h3>
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0, color: "var(--color-forge-text)", lineHeight: 1.6 }}>
                {str("next_practice")}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
