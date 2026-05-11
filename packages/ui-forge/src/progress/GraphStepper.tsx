/**
 * GraphStepper — visual progress indicator for sequential graph execution.
 *
 * Renders a horizontal chain of step chips, each showing:
 *   - Pending: grey, empty circle
 *   - Active (currently running): pulsing purple
 *   - Complete: green with checkmark
 *   - Failed: red with ✕
 *
 * Used inside CompositeAppRenderer to show live node-by-node progress.
 *
 * Key behaviours:
 * - Pure display component — no side effects, no polling.
 * - Accepts progress_label from API and renders below the steps.
 * - Never shows raw node outputs or handoff payloads.
 * - Accessible: role="list" with aria-labels on each step.
 *
 * ISOLATION: must NOT import @cognitive-forge/runtime or any server module.
 */

import React from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Status of a single graph step from the user's perspective. */
export type StepStatus = "pending" | "active" | "complete" | "failed";

export interface GraphStep {
  /** Stable identifier (node.id from the graph definition). */
  id:      string;
  /** Human-readable label for this step. */
  label:   string;
  /** Current status of this step. */
  status:  StepStatus;
}

export interface GraphStepperProps {
  /** Ordered list of steps in the graph (safe: id + label + status only). */
  steps:           GraphStep[];
  /**
   * User-friendly progress description from PublicGraphRunResult.progress_label.
   * Example: "Completed 3 steps successfully".
   */
  progressLabel?:  string | undefined;
  /** Overall graph run status. Controls the summary chip colour. */
  runStatus?:      "idle" | "running" | "complete" | "error" | "partial" | undefined;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ACCENT   = "#6c63ff";
const SUCCESS  = "#34d399";
const ERROR    = "#f87171";
const MUTED    = "#9090a8";
const BORDER   = "#2a2a42";
const BG_DARK  = "#13131f";

const S = {
  wrapper: {
    display:       "flex",
    flexDirection: "column" as const,
    gap:           "0.75rem",
  },
  track: {
    display:        "flex",
    alignItems:     "center",
    gap:            "0.25rem",
    flexWrap:       "wrap" as const,
    padding:        "0.875rem 1rem",
    background:     BG_DARK,
    border:         `1px solid ${BORDER}`,
    borderRadius:   "0.75rem",
  },
  chip: (status: StepStatus) => ({
    display:        "inline-flex",
    alignItems:     "center",
    gap:            "0.375rem",
    padding:        "0.3125rem 0.75rem",
    borderRadius:   "9999px",
    fontSize:       "0.8125rem",
    fontWeight:     500 as const,
    whiteSpace:     "nowrap" as const,
    transition:     "all 0.2s",
    background:
      status === "complete" ? "rgba(52, 211, 153, 0.12)" :
      status === "active"   ? "rgba(108, 99, 255, 0.15)" :
      status === "failed"   ? "rgba(248, 113, 113, 0.12)" :
      "rgba(144, 144, 168, 0.07)",
    color:
      status === "complete" ? SUCCESS  :
      status === "active"   ? ACCENT   :
      status === "failed"   ? ERROR    :
      MUTED,
    border: `1px solid ${
      status === "complete" ? "rgba(52, 211, 153, 0.3)"  :
      status === "active"   ? "rgba(108, 99, 255, 0.3)"  :
      status === "failed"   ? "rgba(248, 113, 113, 0.3)" :
      BORDER
    }`,
  }),
  dot: (status: StepStatus) => ({
    width:        "0.4rem",
    height:       "0.4rem",
    borderRadius: "50%",
    flexShrink:   0 as const,
    background:
      status === "complete" ? SUCCESS  :
      status === "active"   ? ACCENT   :
      status === "failed"   ? ERROR    :
      MUTED,
    animation:    status === "active" ? "stepper-pulse 1.4s ease-in-out infinite" : "none",
  }),
  arrow: {
    color:      MUTED,
    fontSize:   "0.75rem",
    userSelect: "none" as const,
    flexShrink: 0 as const,
  },
  progressRow: {
    display:     "flex",
    alignItems:  "center",
    gap:         "0.5rem",
    padding:     "0 0.25rem",
  },
  progressIcon: (runStatus: GraphStepperProps["runStatus"]) => ({
    fontSize:   "0.875rem",
    flexShrink: 0 as const,
    color:
      runStatus === "complete" ? SUCCESS :
      runStatus === "error"    ? ERROR   :
      runStatus === "partial"  ? "#fbbf24" :
      runStatus === "running"  ? ACCENT   :
      MUTED,
  }),
  progressText: {
    fontSize:   "0.8125rem",
    color:      MUTED,
    lineHeight: 1.4,
  },
} as const;

// ── Step icon ──────────────────────────────────────────────────────────────────

function stepIcon(status: StepStatus): string {
  switch (status) {
    case "complete": return "✓";
    case "failed":   return "✕";
    case "active":   return "●";
    default:         return "○";
  }
}

function progressIcon(runStatus: GraphStepperProps["runStatus"]): string {
  switch (runStatus) {
    case "complete": return "✓";
    case "error":    return "✕";
    case "partial":  return "⚠";
    case "running":  return "●";
    default:         return "·";
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GraphStepper({
  steps,
  progressLabel,
  runStatus = "idle",
}: GraphStepperProps) {
  return (
    <div style={S.wrapper} data-testid="graph-stepper">
      {/* Keyframe animation for the active pulsing dot */}
      <style>{`
        @keyframes stepper-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.75); }
        }
      `}</style>

      <div style={S.track} role="list" aria-label="Graph execution steps">
        {steps.map((step, i) => (
          <React.Fragment key={step.id}>
            <span
              style={S.chip(step.status)}
              role="listitem"
              aria-label={`Step ${i + 1}: ${step.label} — ${step.status}`}
              data-testid={`graph-step-${step.id}`}
              data-status={step.status}
            >
              <span style={S.dot(step.status)} aria-hidden />
              {stepIcon(step.status)} {step.label}
            </span>
            {i < steps.length - 1 && (
              <span style={S.arrow} aria-hidden>→</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {progressLabel && (
        <div style={S.progressRow}>
          <span style={S.progressIcon(runStatus)} aria-hidden>
            {progressIcon(runStatus)}
          </span>
          <span
            style={S.progressText}
            aria-live="polite"
            data-testid="graph-stepper-progress-label"
          >
            {progressLabel}
          </span>
        </div>
      )}
    </div>
  );
}
