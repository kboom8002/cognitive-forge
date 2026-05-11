/**
 * BridgeHandoffPanel — Displays the bridge edges in a human-friendly table.
 * Shows: from node → to node, label, and what keys are passed.
 * Never exposes raw JSON payloads.
 */

import React from "react";
import type { DemoBridgeEdge } from "../../app/demo/_lib/demo-registry";

interface BridgeHandoffPanelProps {
  edges: DemoBridgeEdge[];
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
  table: {
    display:       "flex",
    flexDirection: "column" as const,
    gap:           "0.5rem",
  },
  row: {
    display:      "flex",
    alignItems:   "center",
    gap:          "0.75rem",
    padding:      "0.625rem 0.875rem",
    background:   "rgba(108, 99, 255, 0.04)",
    border:       "1px solid rgba(108, 99, 255, 0.12)",
    borderRadius: "0.5rem",
    flexWrap:     "wrap" as const,
  },
  label: {
    fontSize:   "0.8125rem",
    fontWeight: 600,
    color:      "#e8e8f0",
    minWidth:   "9rem",
    flexShrink: 0,
  },
  arrow: {
    color:      "#6c63ff",
    fontSize:   "0.75rem",
    flexShrink: 0,
  },
  keysRow: {
    display:  "flex",
    flexWrap: "wrap" as const,
    gap:      "0.25rem",
    flex:     1,
  },
  keyChip: {
    padding:      "0.0625rem 0.5rem",
    borderRadius: "0.25rem",
    fontSize:     "0.6875rem",
    fontWeight:   500,
    background:   "rgba(52, 211, 153, 0.08)",
    color:        "#34d399",
    border:       "1px solid rgba(52, 211, 153, 0.2)",
  },
  emptyHint: {
    fontSize:  "0.875rem",
    color:     "#9090a8",
    textAlign: "center" as const,
    padding:   "1rem",
  },
} as const;

export function BridgeHandoffPanel({ edges }: BridgeHandoffPanelProps): React.ReactElement {
  if (edges.length === 0) {
    return (
      <div style={S.wrapper}>
        <div style={S.sectionTitle}>Bridge Handoffs</div>
        <p style={S.emptyHint}>No bridge edges defined for this suite.</p>
      </div>
    );
  }

  return (
    <div style={S.wrapper} data-testid="bridge-handoff-panel">
      <div style={S.sectionTitle}>Bridge Handoffs — {edges.length} edge{edges.length !== 1 ? "s" : ""}</div>
      <div style={S.table}>
        {edges.map((edge, i) => (
          <div key={i} style={S.row}>
            <span style={S.label}>{edge.label}</span>
            <span style={S.arrow}>↗</span>
            <div style={S.keysRow}>
              {edge.handoffKeys.map((key) => (
                <span key={key} style={S.keyChip}>{key}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
