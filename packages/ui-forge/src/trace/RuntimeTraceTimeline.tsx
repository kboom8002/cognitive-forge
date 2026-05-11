import React from "react";

export interface PublicTraceSummary {
  id: string;
  timestamp: string;
  label: string;
  status: "success" | "running" | "error" | "warning";
  details?: Record<string, unknown>;
}

export interface RuntimeTraceTimelineProps {
  summaries: PublicTraceSummary[];
  isBuilderMode?: boolean;
}

const S = {
  wrapper: {
    padding:      "1.25rem",
    background:   "var(--color-forge-800, #13131f)",
    border:       "1px solid var(--color-forge-border, #2a2a42)",
    borderRadius: "0.875rem",
  },
  sectionTitle: {
    fontSize:     "0.75rem",
    fontWeight:   600,
    letterSpacing:"0.07em",
    textTransform:"uppercase" as const,
    color:        "var(--color-forge-muted, #9090a8)",
    marginBottom: "1rem",
  },
  timeline: {
    display:       "flex",
    flexDirection: "column" as const,
    gap:           "0",
  },
  event: (status: string) => ({
    display:   "flex",
    alignItems:"flex-start",
    gap:       "0.875rem",
    opacity:   1,
  }),
  lineCol: {
    display:       "flex",
    flexDirection: "column" as const,
    alignItems:    "center",
    flexShrink:    0,
    width:         "1.25rem",
  },
  dot: (status: string) => {
    let bg = "var(--color-forge-border, #2a2a42)";
    let border = "var(--color-forge-border, #2a2a42)";
    
    if (status === "success") {
      bg = "#34d399";
      border = "rgba(52, 211, 153, 0.4)";
    } else if (status === "running") {
      bg = "#60a5fa"; // blue for running
      border = "rgba(96, 165, 250, 0.4)";
    } else if (status === "error") {
      bg = "#ef4444";
      border = "rgba(239, 68, 68, 0.4)";
    } else if (status === "warning") {
      bg = "#fbbf24";
      border = "rgba(251, 191, 36, 0.4)";
    }

    return {
      width:        "0.625rem",
      height:       "0.625rem",
      borderRadius: "50%",
      background:   bg,
      border:       `2px solid ${border}`,
      flexShrink:   0,
      marginTop:    "0.125rem",
    };
  },
  line: (isLast: boolean) => ({
    width:      "1px",
    flex:       1,
    minHeight:  "1.5rem",
    background: isLast ? "transparent" : "var(--color-forge-border, #2a2a42)",
    margin:     "0.125rem 0",
  }),
  content: {
    display:       "flex",
    flexDirection: "column" as const,
    gap:           "0.25rem",
    paddingBottom: "1rem",
    flex:          1,
  },
  label: {
    fontSize:   "0.875rem",
    fontWeight: 600,
    color:      "var(--color-forge-text, #e8e8f0)",
    lineHeight: 1.3,
  },
  meta: {
    fontSize:   "0.75rem",
    color:      "var(--color-forge-muted, #9090a8)",
  },
  detailsBox: {
    marginTop: "0.25rem",
    padding: "0.5rem",
    background: "rgba(0,0,0,0.2)",
    borderRadius: "0.25rem",
    fontSize: "0.75rem",
    color: "var(--color-forge-muted, #9090a8)",
    fontFamily: "monospace",
    whiteSpace: "pre-wrap" as const,
  }
} as const;

export function RuntimeTraceTimeline({ summaries, isBuilderMode }: RuntimeTraceTimelineProps) {
  if (!summaries || summaries.length === 0) return null;

  return (
    <div style={S.wrapper} data-testid="runtime-trace-timeline">
      <div style={S.sectionTitle}>Runtime Trace</div>
      <div style={S.timeline}>
        {summaries.map((summary, i) => {
          const isLast = i === summaries.length - 1;
          const time = new Date(summary.timestamp).toLocaleTimeString(undefined, { hour12: false });
          
          return (
            <div key={summary.id} style={S.event(summary.status)}>
              <div style={S.lineCol}>
                <div style={S.dot(summary.status)} aria-hidden />
                <div style={S.line(isLast)} aria-hidden />
              </div>
              <div style={S.content}>
                <div style={S.label}>{summary.label}</div>
                <div style={S.meta}>{time}</div>
                
                {isBuilderMode && summary.details && Object.keys(summary.details).length > 0 && (
                  <div style={S.detailsBox}>
                    {JSON.stringify(summary.details, null, 2)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
