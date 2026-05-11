import React, { useState } from "react";

// Redefine DTO locally to preserve package isolation (ui-forge cannot import from runtime)
export interface BuilderInspectionSummary {
  casepack_keys?: string[];
  graph_key?: string;
  bridges?: any[];
  validation_status?: string;
  trace_events?: any[];
  contracts?: {
    input?: Record<string, any>;
    output?: Record<string, any>;
  };
}

export interface BuilderInspectionPanelProps {
  summary: BuilderInspectionSummary;
  publicMode?: boolean;
}

const S = {
  container: {
    background: "rgba(0, 0, 0, 0.4)",
    border: "1px dashed var(--color-forge-accent, #6c63ff)",
    borderRadius: "0.75rem",
    padding: "1.25rem",
    marginTop: "2rem",
    fontFamily: "var(--font-forge-sans, system-ui, sans-serif)",
  },
  header: {
    fontSize: "0.875rem",
    fontWeight: 700,
    color: "var(--color-forge-accent, #6c63ff)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    marginBottom: "1rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tabs: {
    display: "flex",
    gap: "0.5rem",
    marginBottom: "1rem",
    borderBottom: "1px solid var(--color-forge-border, #2a2a42)",
    paddingBottom: "0.5rem",
  },
  tabBtn: (isActive: boolean) => ({
    background: isActive ? "rgba(108, 99, 255, 0.2)" : "transparent",
    border: "none",
    color: isActive ? "#6c63ff" : "var(--color-forge-muted, #9090a8)",
    padding: "0.375rem 0.75rem",
    borderRadius: "0.375rem",
    fontSize: "0.8125rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  }),
  contentBox: {
    background: "var(--color-forge-800, #13131f)",
    border: "1px solid var(--color-forge-border, #2a2a42)",
    borderRadius: "0.5rem",
    padding: "1rem",
    fontSize: "0.8125rem",
    color: "var(--color-forge-text, #e8e8f0)",
    overflowX: "auto" as const,
    whiteSpace: "pre-wrap" as const,
    fontFamily: "monospace",
  },
  badge: {
    background: "rgba(108, 99, 255, 0.1)",
    color: "#6c63ff",
    padding: "0.125rem 0.5rem",
    borderRadius: "9999px",
    fontSize: "0.7rem",
    fontWeight: 700,
    marginRight: "0.5rem",
    display: "inline-block",
    marginBottom: "0.5rem",
  }
} as const;

export function BuilderInspectionPanel({ summary, publicMode = true }: BuilderInspectionPanelProps) {
  const [activeTab, setActiveTab] = useState<"graph" | "bridges" | "contracts" | "trace">("graph");

  // Strictly omit rendering entirely if in public mode
  if (publicMode) return null;

  return (
    <div style={S.container} data-testid="builder-inspection-panel">
      <div style={S.header}>
        <span>Builder Inspection Panel</span>
        <span style={{ fontSize: "0.7rem", fontWeight: 400, color: "#9090a8" }}>Internal View</span>
      </div>

      <div style={S.tabs}>
        <button type="button" style={S.tabBtn(activeTab === "graph")} onClick={() => setActiveTab("graph")}>
          Graph & CasePacks
        </button>
        <button type="button" style={S.tabBtn(activeTab === "contracts")} onClick={() => setActiveTab("contracts")}>
          Contracts
        </button>
        <button type="button" style={S.tabBtn(activeTab === "bridges")} onClick={() => setActiveTab("bridges")}>
          Bridges
        </button>
      </div>

      {activeTab === "graph" && (
        <div style={S.contentBox}>
          <div style={{ marginBottom: "1rem" }}>
            <strong style={{ color: "#34d399" }}>Graph:</strong> {summary.graph_key || "None"}
          </div>
          <div>
            <strong style={{ color: "#34d399" }}>CasePacks Executed:</strong>
            <div style={{ marginTop: "0.5rem" }}>
              {summary.casepack_keys?.length ? (
                summary.casepack_keys.map((key) => (
                  <span key={key} style={S.badge}>{key}</span>
                ))
              ) : (
                <span style={{ color: "#9090a8" }}>No CasePacks logged.</span>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "contracts" && (
        <div style={S.contentBox}>
          {JSON.stringify(summary.contracts || {}, null, 2)}
        </div>
      )}

      {activeTab === "bridges" && (
        <div style={S.contentBox}>
          {summary.bridges?.length ? (
            summary.bridges.map((b, i) => (
              <div key={i} style={{ marginBottom: "1rem" }}>
                <strong style={{ color: "#fbbf24" }}>{b.key || `Bridge ${i}`}</strong>
                <pre style={{ margin: "0.5rem 0 0", color: "#9090a8" }}>
                  {JSON.stringify(b.mapped_data || b, null, 2)}
                </pre>
              </div>
            ))
          ) : (
            <span style={{ color: "#9090a8" }}>No bridges executed.</span>
          )}
        </div>
      )}
    </div>
  );
}
