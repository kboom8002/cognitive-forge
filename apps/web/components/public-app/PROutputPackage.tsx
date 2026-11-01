"use client";

import React, { useState } from "react";
import type { CompositeRunState } from "@cognitive-forge/ui-forge";
import type { OutputValue } from "@cognitive-forge/ui-forge";

interface PROutputPackageProps {
  status: CompositeRunState;
  finalOutput: Record<string, OutputValue>;
  errorMessage?: string;
}

const TABS = [
  { id: "brand_positioning", label: "Brand Positioning", key: "brand_positioning_statement" },
  { id: "answer_card", label: "Answer Card", key: "answer_card" },
  { id: "press_release", label: "Press Release", key: "press_release" },
  { id: "company_profile", label: "Company Profile", key: "company_profile" },
  { id: "web_brochure", label: "Web Brochure", key: "web_brochure" },
  { id: "consistency_audit", label: "Consistency Audit", key: "consistency_audit" },
];

const DEFAULT_TAB = "brand_positioning";

export function PROutputPackage({ status, finalOutput, errorMessage }: PROutputPackageProps) {
  const [activeTab, setActiveTab] = useState(DEFAULT_TAB);
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

  const handleCopy = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
  };

  const handleDownloadPackage = () => {
    const sections = TABS.map((t) => {
      const val = (finalOutput[t.key] as string) || "";
      return `## ${t.label}\n\n${val}`;
    });
    if (finalOutput.risk_notes) {
      sections.push(`## Risk Notes\n\n${String(finalOutput.risk_notes)}`);
    }
    const md = `# Corporate PR Package\n\n${sections.join("\n\n---\n\n")}\n`;
    if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
      const blob = new Blob([md], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "corporate_pr_package.md";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  const activeTabData = TABS.find((t) => t.id === activeTab);
  const content = activeTabData ? (finalOutput[activeTabData.key] as string) || "" : "";

  return (
    <div style={{ background: "var(--color-forge-800)", borderRadius: "0.5rem", overflow: "hidden", marginTop: "2rem" }}>
      {/* Header and Score */}
      <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--color-forge-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: "1.25rem", color: "var(--color-forge-text)" }}>Corporate PR Package</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {finalOutput.audit_score && (
            <div style={{ padding: "0.25rem 0.75rem", background: "rgba(52, 211, 153, 0.1)", color: "#34d399", borderRadius: "999px", fontSize: "0.875rem", fontWeight: 600 }}>
              {String(finalOutput.audit_score)}
            </div>
          )}
          <button
            data-testid="download-pr-package"
            type="button"
            onClick={handleDownloadPackage}
            style={{
              padding: "0.5rem 1rem",
              background: "rgba(108, 99, 255, 0.15)",
              color: "#e8e8f0",
              border: "1px solid rgba(108, 99, 255, 0.35)",
              borderRadius: "0.25rem",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.875rem",
            }}
            title="Download complete Corporate PR package as Markdown"
          >
            {downloaded ? "Downloaded!" : "Download Package"}
          </button>
        </div>
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
        {activeTabData && (
          <div style={{ display: activeTab === activeTabData.id ? "block" : "none" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
              {(activeTabData.id === "press_release" || activeTabData.id === "web_brochure") && (
                <button
                  data-testid={`copy-${activeTabData.id.replace('_', '-')}`}
                  onClick={() => handleCopy(content)}
                  style={{ padding: "0.25rem 0.75rem", background: "var(--color-forge-accent)", color: "white", border: "none", borderRadius: "0.25rem", cursor: "pointer", fontSize: "0.875rem" }}
                >
                  Copy to Clipboard
                </button>
              )}
            </div>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0, color: "var(--color-forge-text)", lineHeight: 1.6 }}>
              {content}
            </pre>

            {/* Risk Notes specific to Consistency Audit tab */}
            {activeTabData.id === "consistency_audit" && finalOutput.risk_notes && (
              <div data-testid="risk-notes-card" style={{ marginTop: "1.5rem", padding: "1rem", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "0.5rem", color: "#f87171" }}>
                <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem" }}>⚠️ Risk Notes</h3>
                <p style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.5 }}>
                  {String(finalOutput.risk_notes)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
