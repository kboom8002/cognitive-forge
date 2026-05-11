/**
 * CasePackGraphVisualizer — Visual graph topology showing nodes and bridge edges.
 * Pure display — no state, no effects.
 * Never shows raw JSON or casepack internals.
 */

import React from "react";
import type { DemoCasePackNode, DemoBridgeEdge } from "../../app/demo/_lib/demo-registry";

interface CasePackGraphVisualizerProps {
  nodes:         DemoCasePackNode[];
  edges:         DemoBridgeEdge[];
  completedNodes?: string[];
  activeNode?:   string | undefined;
  accentColor:   string;
}

type NodeStatus = "complete" | "active" | "pending";

function getNodeStatus(nodeId: string, completedNodes: string[], activeNode?: string): NodeStatus {
  if (completedNodes.includes(nodeId)) return "complete";
  if (activeNode === nodeId) return "active";
  return "pending";
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
  track: {
    display:    "flex",
    flexWrap:   "wrap" as const,
    alignItems: "center",
    gap:        "0.375rem",
  },
  node: (status: NodeStatus, accentColor: string) => ({
    display:      "flex",
    flexDirection:"column" as const,
    alignItems:   "center",
    gap:          "0.375rem",
    padding:      "0.625rem 0.875rem",
    borderRadius: "0.625rem",
    fontSize:     "0.8125rem",
    fontWeight:   500,
    lineHeight:   1.3,
    textAlign:    "center" as const,
    minWidth:     "7.5rem",
    maxWidth:     "10rem",
    transition:   "all 0.25s",
    background:
      status === "complete" ? "rgba(52, 211, 153, 0.1)"  :
      status === "active"   ? `${accentColor}1a`          :
      "rgba(144, 144, 168, 0.06)",
    border: `1px solid ${
      status === "complete" ? "rgba(52, 211, 153, 0.3)"  :
      status === "active"   ? `${accentColor}55`          :
      "#2a2a42"
    }`,
    color:
      status === "complete" ? "#34d399" :
      status === "active"   ? accentColor :
      "#9090a8",
    boxShadow:
      status === "active" ? `0 0 12px ${accentColor}25` : "none",
  }),
  nodeIcon: (status: NodeStatus) => ({
    fontSize:   "1rem",
    lineHeight: 1,
  }),
  nodeLabel: {
    fontSize:   "0.8rem",
    fontWeight: 600,
  },
  nodeRole: {
    fontSize:   "0.6875rem",
    fontWeight: 400,
    opacity:    0.75,
    display:    "-webkit-box" as const,
    WebkitLineClamp: 1,
    WebkitBoxOrient: "vertical" as const,
    overflow:   "hidden",
  },
  arrow: {
    color:      "#2a2a42",
    fontSize:   "1rem",
    flexShrink: 0,
    userSelect: "none" as const,
  },
  outputKeys: {
    display:    "flex",
    flexWrap:   "wrap" as const,
    gap:        "0.25rem",
    marginTop:  "0.25rem",
    justifyContent: "center" as const,
  },
  outputKey: {
    padding:      "0.0625rem 0.375rem",
    borderRadius: "0.25rem",
    fontSize:     "0.625rem",
    fontWeight:   500,
    background:   "rgba(144, 144, 168, 0.1)",
    color:        "#9090a8",
    border:       "1px solid #2a2a42",
  },
} as const;

function nodeIcon(status: NodeStatus): string {
  if (status === "complete") return "✓";
  if (status === "active")   return "●";
  return "○";
}

export function CasePackGraphVisualizer({
  nodes,
  edges: _edges,
  completedNodes = [],
  activeNode,
  accentColor,
}: CasePackGraphVisualizerProps): React.ReactElement {
  return (
    <div style={S.wrapper} data-testid="casepack-graph-visualizer">
      <div style={S.sectionTitle}>Pipeline Architecture</div>
      <div style={S.track} role="list" aria-label="Graph execution pipeline">
        {nodes.map((node, i) => {
          const status = getNodeStatus(node.id, completedNodes, activeNode);
          return (
            <React.Fragment key={node.id}>
              <div
                style={S.node(status, accentColor)}
                role="listitem"
                aria-label={`Step ${i + 1}: ${node.label} — ${status}`}
                data-testid={`graph-node-${node.id}`}
                data-status={status}
              >
                <span style={S.nodeIcon(status)} aria-hidden>{nodeIcon(status)}</span>
                <span style={S.nodeLabel}>{node.label}</span>
                <span style={S.nodeRole}>{node.role}</span>
                <div style={S.outputKeys}>
                  {node.outputKeys.slice(0, 2).map((key) => (
                    <span key={key} style={S.outputKey}>{key}</span>
                  ))}
                  {node.outputKeys.length > 2 && (
                    <span style={S.outputKey}>+{node.outputKeys.length - 2}</span>
                  )}
                </div>
              </div>
              {i < nodes.length - 1 && (
                <span style={S.arrow} aria-hidden>→</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
