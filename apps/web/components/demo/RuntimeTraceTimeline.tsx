/**
 * RuntimeTraceTimeline — Simulated trace event timeline.
 * Shows a vertical list of completed nodes with simulated durations.
 * Never exposes raw trace payloads or casepack internals.
 */

import React from "react";
import type { DemoTraceEvent } from "../../app/demo/_lib/demo-registry";

interface RuntimeTraceTimelineProps {
  events:          DemoTraceEvent[];
  completedSteps:  number;
  accentColor:     string;
}

const S = {
  wrapper: {
    padding:      "1.25rem",
    background:   "#13131f",
    border:       "1px solid #2a2a42",
    borderRadius: "0.875rem",
  },
  sectionTitle: {
    fontSize:     "0.75rem",
    fontWeight:   600,
    letterSpacing:"0.07em",
    textTransform:"uppercase" as const,
    color:        "#9090a8",
    marginBottom: "1rem",
  },
  timeline: {
    display:       "flex",
    flexDirection: "column" as const,
    gap:           "0",
  },
  event: (isVisible: boolean) => ({
    display:   "flex",
    alignItems:"flex-start",
    gap:       "0.875rem",
    opacity:   isVisible ? 1 : 0.3,
    transition:"opacity 0.4s",
  }),
  lineCol: {
    display:       "flex",
    flexDirection: "column" as const,
    alignItems:    "center",
    flexShrink:    0,
    width:         "1.25rem",
  },
  dot: (isVisible: boolean, accentColor: string) => ({
    width:        "0.625rem",
    height:       "0.625rem",
    borderRadius: "50%",
    background:   isVisible ? "#34d399" : "#2a2a42",
    border:       isVisible ? "2px solid rgba(52, 211, 153, 0.4)" : "2px solid #2a2a42",
    flexShrink:   0,
    marginTop:    "0.125rem",
    transition:   "background 0.3s",
  }),
  line: (isLast: boolean) => ({
    width:      "1px",
    flex:       1,
    minHeight:  "2rem",
    background: isLast ? "transparent" : "#2a2a42",
    margin:     "0.125rem 0",
  }),
  content: {
    display:       "flex",
    flexDirection: "column" as const,
    gap:           "0.125rem",
    paddingBottom: "1.25rem",
    flex:          1,
  },
  nodeName: {
    fontSize:   "0.875rem",
    fontWeight: 600,
    color:      "#e8e8f0",
    lineHeight: 1.3,
  },
  meta: {
    display:    "flex",
    alignItems: "center",
    gap:        "0.5rem",
  },
  duration: {
    fontSize:   "0.75rem",
    color:      "#34d399",
    fontWeight: 500,
  },
  stepLabel: {
    fontSize:   "0.75rem",
    color:      "#9090a8",
  },
  totalRow: {
    display:    "flex",
    alignItems: "center",
    justifyContent: "space-between" as const,
    padding:    "0.625rem 0.875rem",
    background: "rgba(52, 211, 153, 0.06)",
    border:     "1px solid rgba(52, 211, 153, 0.2)",
    borderRadius:"0.5rem",
    marginTop:  "0.5rem",
  },
  totalLabel: {
    fontSize:   "0.8125rem",
    fontWeight: 600,
    color:      "#e8e8f0",
  },
  totalDuration: {
    fontSize:   "0.875rem",
    fontWeight: 700,
    color:      "#34d399",
  },
} as const;

export function RuntimeTraceTimeline({
  events,
  completedSteps,
  accentColor,
}: RuntimeTraceTimelineProps): React.ReactElement {
  const visibleEvents = events.slice(0, completedSteps);
  const totalMs = visibleEvents.reduce((sum, e) => sum + e.durationMs, 0);

  return (
    <div style={S.wrapper} data-testid="runtime-trace-timeline">
      <div style={S.sectionTitle}>Runtime Trace — Node Execution Sequence</div>
      <div style={S.timeline}>
        {events.map((event, i) => {
          const isVisible = i < completedSteps;
          const isLast    = i === events.length - 1;
          return (
            <div key={event.nodeId} style={S.event(isVisible)}>
              <div style={S.lineCol}>
                <div style={S.dot(isVisible, accentColor)} aria-hidden />
                <div style={S.line(isLast)} aria-hidden />
              </div>
              <div style={S.content}>
                <div style={S.nodeName}>{event.nodeLabel}</div>
                <div style={S.meta}>
                  <span style={S.stepLabel}>Step {event.step}</span>
                  {isVisible && (
                    <span style={S.duration}>✓ {(event.durationMs / 1000).toFixed(2)}s</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {completedSteps > 0 && (
        <div style={S.totalRow}>
          <span style={S.totalLabel}>Total execution time ({completedSteps}/{events.length} steps)</span>
          <span style={S.totalDuration}>{(totalMs / 1000).toFixed(2)}s</span>
        </div>
      )}
    </div>
  );
}
