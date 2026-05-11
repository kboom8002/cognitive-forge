import React from "react";

export interface BridgeCompatibilityReport {
  status: "compatible" | "incompatible" | "warning";
  score: number;
  missing_mappings: string[];
  warnings: string[];
  recommended_bridge?: string;
}

export interface BridgeCompatibilityPanelProps {
  report: BridgeCompatibilityReport;
}

const S = {
  container: {
    background: "var(--color-forge-800, #13131f)",
    border: "1px solid var(--color-forge-border, #2a2a42)",
    borderRadius: "0.875rem",
    padding: "1.25rem",
    fontFamily: "var(--font-forge-sans, system-ui, sans-serif)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  },
  title: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "var(--color-forge-text, #e8e8f0)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    margin: 0,
  },
  badge: (status: string) => {
    let bg = "rgba(108, 99, 255, 0.1)";
    let color = "#6c63ff";
    let border = "1px solid rgba(108, 99, 255, 0.3)";

    if (status === "compatible") {
      bg = "rgba(52, 211, 153, 0.1)";
      color = "#34d399";
      border = "1px solid rgba(52, 211, 153, 0.3)";
    } else if (status === "incompatible") {
      bg = "rgba(239, 68, 68, 0.1)";
      color = "#ef4444";
      border = "1px solid rgba(239, 68, 68, 0.3)";
    } else if (status === "warning") {
      bg = "rgba(251, 191, 36, 0.1)";
      color = "#fbbf24";
      border = "1px solid rgba(251, 191, 36, 0.3)";
    }

    return {
      padding: "0.25rem 0.625rem",
      borderRadius: "9999px",
      fontSize: "0.7rem",
      fontWeight: 700,
      textTransform: "uppercase" as const,
      background: bg,
      color,
      border,
    };
  },
  scoreRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "1rem",
  },
  scoreBarBg: {
    flex: 1,
    height: "0.5rem",
    background: "var(--color-forge-700, #1e1e30)",
    borderRadius: "9999px",
    overflow: "hidden",
  },
  scoreBarFill: (score: number) => ({
    height: "100%",
    width: `${score}%`,
    background: score === 100 ? "#34d399" : score > 50 ? "#fbbf24" : "#ef4444",
    transition: "width 0.5s ease-out",
  }),
  scoreText: {
    fontSize: "0.875rem",
    fontWeight: 700,
    color: "var(--color-forge-text, #e8e8f0)",
  },
  listContainer: {
    marginTop: "1rem",
  },
  listTitle: (isError: boolean) => ({
    fontSize: "0.75rem",
    fontWeight: 600,
    color: isError ? "#ef4444" : "#fbbf24",
    marginBottom: "0.5rem",
  }),
  listItem: {
    fontSize: "0.8125rem",
    color: "var(--color-forge-muted, #9090a8)",
    paddingLeft: "1rem",
    marginBottom: "0.25rem",
    position: "relative" as const,
  },
  bullet: (isError: boolean) => ({
    position: "absolute" as const,
    left: 0,
    top: "0.375rem",
    width: "0.375rem",
    height: "0.375rem",
    borderRadius: "50%",
    background: isError ? "#ef4444" : "#fbbf24",
  })
} as const;

export function BridgeCompatibilityPanel({ report }: BridgeCompatibilityPanelProps) {
  return (
    <div style={S.container} data-testid="bridge-compatibility-panel">
      <div style={S.header}>
        <h4 style={S.title}>Compatibility Report</h4>
        <span style={S.badge(report.status)}>{report.status}</span>
      </div>

      <div style={S.scoreRow}>
        <div style={S.scoreBarBg}>
          <div style={S.scoreBarFill(report.score)} />
        </div>
        <span style={S.scoreText}>{report.score}%</span>
      </div>

      {report.missing_mappings.length > 0 && (
        <div style={S.listContainer}>
          <div style={S.listTitle(true)}>Missing Required Fields</div>
          {report.missing_mappings.map(key => (
            <div key={key} style={S.listItem}>
              <div style={S.bullet(true)} />
              {key}
            </div>
          ))}
        </div>
      )}

      {report.warnings.length > 0 && (
        <div style={S.listContainer}>
          <div style={S.listTitle(false)}>Warnings</div>
          {report.warnings.map((msg, i) => (
            <div key={i} style={S.listItem}>
              <div style={S.bullet(false)} />
              {msg}
            </div>
          ))}
        </div>
      )}

      {report.recommended_bridge && (
        <div style={{ marginTop: "1rem", fontSize: "0.8125rem", color: "#6c63ff" }}>
          <strong>Recommended Bridge:</strong> {report.recommended_bridge}
        </div>
      )}
    </div>
  );
}
