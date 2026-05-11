/**
 * SuiteOverviewPanel — Displays suite metadata: title, description, step count, category.
 * Pure display, no state.
 */

import React from "react";
import type { DemoSuite } from "../../app/demo/_lib/demo-registry";

interface SuiteOverviewPanelProps {
  suite: DemoSuite;
}

const S = {
  panel: {
    display:      "flex",
    flexDirection:"column" as const,
    gap:          "1rem",
    padding:      "1.5rem",
    background:   "#13131f",
    border:       "1px solid #2a2a42",
    borderRadius: "0.875rem",
  },
  header: {
    display:    "flex",
    alignItems: "flex-start",
    gap:        "1rem",
  },
  icon: {
    fontSize:     "2.25rem",
    lineHeight:   1,
    flexShrink:   0,
  },
  titleGroup: {
    display:       "flex",
    flexDirection: "column" as const,
    gap:           "0.25rem",
    flex:          1,
  },
  title: {
    fontSize:   "1.25rem",
    fontWeight: 800,
    color:      "#e8e8f0",
    margin:     0,
    lineHeight: 1.25,
  },
  description: {
    fontSize:   "0.9375rem",
    color:      "#9090a8",
    lineHeight: 1.6,
    margin:     0,
  },
  statsRow: {
    display:    "flex",
    gap:        "1rem",
    flexWrap:   "wrap" as const,
    paddingTop: "0.25rem",
    borderTop:  "1px solid #2a2a42",
  },
  stat: {
    display:       "flex",
    flexDirection: "column" as const,
    gap:           "0.125rem",
  },
  statLabel: {
    fontSize:     "0.7rem",
    fontWeight:   600,
    letterSpacing:"0.06em",
    textTransform:"uppercase" as const,
    color:        "#9090a8",
  },
  statValue: (color: string) => ({
    fontSize:   "0.9375rem",
    fontWeight: 700,
    color,
  }),
} as const;

export function SuiteOverviewPanel({ suite }: SuiteOverviewPanelProps) {
  return (
    <div style={S.panel} data-testid="suite-overview-panel">
      <div style={S.header}>
        <span style={S.icon} aria-hidden>{suite.icon}</span>
        <div style={S.titleGroup}>
          <h2 style={S.title}>{suite.title}</h2>
          <p style={S.description}>{suite.description}</p>
        </div>
      </div>
      <div style={S.statsRow}>
        <div style={S.stat}>
          <span style={S.statLabel}>Steps</span>
          <span style={S.statValue(suite.accentColor)}>{suite.stepCount} CasePacks</span>
        </div>
        <div style={S.stat}>
          <span style={S.statLabel}>Category</span>
          <span style={S.statValue("#e8e8f0")}>{suite.category}</span>
        </div>
        <div style={S.stat}>
          <span style={S.statLabel}>Type</span>
          <span style={S.statValue("#e8e8f0")}>Graph App</span>
        </div>
        <div style={S.stat}>
          <span style={S.statLabel}>Bridges</span>
          <span style={S.statValue("#e8e8f0")}>{suite.edges.length} handoff{suite.edges.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  );
}
