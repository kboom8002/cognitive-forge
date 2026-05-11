import React from "react";

export interface PublicTrustSignalSummary {
  validation_status: "pass" | "warning" | "fail";
  completeness_score?: number;
  risk_notes?: string[];
  missing_information?: string[];
  is_export_ready: boolean;
}

export interface InternalTrustSignalPayload extends PublicTrustSignalSummary {
  _internal_report?: Record<string, unknown>;
}

export interface TrustSignalPanelProps {
  signals: PublicTrustSignalSummary | InternalTrustSignalPayload;
  publicMode?: boolean;
}

const S = {
  container: {
    background: "var(--color-forge-800, #13131f)",
    border: "1px solid var(--color-forge-border, #2a2a42)",
    borderRadius: "0.75rem",
    padding: "1rem",
    marginBottom: "1.5rem",
    fontFamily: "var(--font-forge-sans, system-ui, sans-serif)",
  },
  headerRow: {
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
  statusBadge: (status: string) => {
    let bg = "rgba(251, 191, 36, 0.1)";
    let color = "#fbbf24";
    let border = "1px solid rgba(251, 191, 36, 0.3)";

    if (status === "pass") {
      bg = "rgba(52, 211, 153, 0.1)";
      color = "#34d399";
      border = "1px solid rgba(52, 211, 153, 0.3)";
    } else if (status === "fail") {
      bg = "rgba(239, 68, 68, 0.1)";
      color = "#ef4444";
      border = "1px solid rgba(239, 68, 68, 0.3)";
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
  exportBadge: (ready: boolean) => ({
    padding: "0.25rem 0.625rem",
    borderRadius: "9999px",
    fontSize: "0.7rem",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    background: ready ? "rgba(96, 165, 250, 0.1)" : "rgba(144, 144, 168, 0.1)",
    color: ready ? "#60a5fa" : "#9090a8",
    border: ready ? "1px solid rgba(96, 165, 250, 0.3)" : "1px solid rgba(144, 144, 168, 0.3)",
    marginLeft: "0.5rem",
  }),
  metricsRow: {
    display: "flex",
    gap: "1.5rem",
    marginBottom: "1rem",
  },
  metricBlock: {
    flex: 1,
  },
  metricLabel: {
    fontSize: "0.75rem",
    color: "var(--color-forge-muted, #9090a8)",
    marginBottom: "0.25rem",
  },
  metricValue: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "var(--color-forge-text, #e8e8f0)",
  },
  listContainer: {
    marginTop: "1rem",
    background: "var(--color-forge-700, #1e1e30)",
    padding: "0.75rem",
    borderRadius: "0.5rem",
  },
  listTitle: (isWarning: boolean) => ({
    fontSize: "0.75rem",
    fontWeight: 600,
    color: isWarning ? "#fbbf24" : "#ef4444",
    marginBottom: "0.5rem",
    textTransform: "uppercase" as const,
  }),
  listItem: {
    fontSize: "0.8125rem",
    color: "var(--color-forge-muted, #9090a8)",
    marginBottom: "0.25rem",
    display: "flex",
    alignItems: "flex-start",
    gap: "0.5rem",
  },
  bullet: (isWarning: boolean) => ({
    width: "0.375rem",
    height: "0.375rem",
    borderRadius: "50%",
    background: isWarning ? "#fbbf24" : "#ef4444",
    marginTop: "0.375rem",
    flexShrink: 0,
  }),
  builderBlock: {
    marginTop: "1rem",
    padding: "0.75rem",
    background: "rgba(0,0,0,0.3)",
    border: "1px dashed #6c63ff",
    borderRadius: "0.5rem",
    fontSize: "0.75rem",
    color: "#e8e8f0",
    fontFamily: "monospace",
    whiteSpace: "pre-wrap" as const,
  }
} as const;

export function TrustSignalPanel({ signals, publicMode = true }: TrustSignalPanelProps) {
  return (
    <div style={S.container} data-testid="trust-signal-panel">
      <div style={S.headerRow}>
        <h4 style={S.title}>Output Trust Signals</h4>
        <div>
          <span style={S.statusBadge(signals.validation_status)}>
            {signals.validation_status}
          </span>
          <span style={S.exportBadge(signals.is_export_ready)}>
            {signals.is_export_ready ? "Ready for Export" : "Draft / Incomplete"}
          </span>
        </div>
      </div>

      <div style={S.metricsRow}>
        {signals.completeness_score !== undefined && (
          <div style={S.metricBlock}>
            <div style={S.metricLabel}>Completeness</div>
            <div style={S.metricValue}>{signals.completeness_score}% Complete</div>
          </div>
        )}
      </div>

      {signals.risk_notes && signals.risk_notes.length > 0 && (
        <div style={S.listContainer}>
          <div style={S.listTitle(true)}>Risk Notes</div>
          {signals.risk_notes.map((note: string, i: number) => (
            <div key={i} style={S.listItem}>
              <div style={S.bullet(true)} />
              {note}
            </div>
          ))}
        </div>
      )}

      {signals.missing_information && signals.missing_information.length > 0 && (
        <div style={S.listContainer}>
          <div style={S.listTitle(false)}>Missing Information</div>
          {signals.missing_information.map((info: string, i: number) => (
            <div key={i} style={S.listItem}>
              <div style={S.bullet(false)} />
              {info}
            </div>
          ))}
        </div>
      )}

      {!publicMode && "_internal_report" in signals && signals._internal_report && (
        <div style={S.builderBlock}>
          <strong style={{ color: "#6c63ff" }}>Internal Report (Builder Mode)</strong>
          <br />
          {JSON.stringify(signals._internal_report, null, 2)}
        </div>
      )}
    </div>
  );
}
