/**
 * DemoModeToggle — Toggle between "Static Demo" and "Live Runtime" modes.
 * Live Runtime is always disabled in this sprint (placeholder UI).
 */

import React from "react";

export type DemoMode = "static" | "live";

interface DemoModeToggleProps {
  mode:     DemoMode;
  onChange: (mode: DemoMode) => void;
}

const S = {
  wrapper: {
    display:      "flex",
    alignItems:   "center",
    gap:          "0.375rem",
    padding:      "0.25rem",
    background:   "#13131f",
    border:       "1px solid #2a2a42",
    borderRadius: "0.625rem",
    width:        "fit-content",
  },
  button: (isActive: boolean, isDisabled: boolean) => ({
    display:      "inline-flex",
    alignItems:   "center",
    gap:          "0.375rem",
    padding:      "0.375rem 0.875rem",
    borderRadius: "0.4375rem",
    fontSize:     "0.8125rem",
    fontWeight:   600,
    cursor:       isDisabled ? "not-allowed" : "pointer",
    border:       "none",
    transition:   "all 0.15s",
    background:   isActive  ? (isDisabled ? "#2a2a42" : "#1e1e30") : "transparent",
    color:        isActive  ? (isDisabled ? "#9090a8" : "#e8e8f0") : "#9090a8",
    boxShadow:    isActive  ? "0 1px 3px rgba(0,0,0,0.3)" : "none",
    opacity:      isDisabled ? 0.6 : 1,
  }),
  dot: (isActive: boolean, color: string) => ({
    width:        "0.4rem",
    height:       "0.4rem",
    borderRadius: "50%",
    background:   isActive ? color : "#9090a8",
    display:      "inline-block",
  }),
  liveTag: {
    padding:      "0.0625rem 0.375rem",
    borderRadius: "9999px",
    fontSize:     "0.6rem",
    fontWeight:   700,
    letterSpacing:"0.06em",
    textTransform:"uppercase" as const,
    background:   "rgba(251, 146, 60, 0.15)",
    color:        "#fb923c",
    border:       "1px solid rgba(251, 146, 60, 0.3)",
  },
} as const;

export function DemoModeToggle({ mode, onChange }: DemoModeToggleProps): React.ReactElement {
  return (
    <div style={S.wrapper} role="group" aria-label="Demo mode selector">
      <button
        style={S.button(mode === "static", false)}
        onClick={() => onChange("static")}
        aria-pressed={mode === "static"}
        id="demo-mode-static"
        type="button"
      >
        <span style={S.dot(mode === "static", "#6c63ff")} aria-hidden />
        Static Demo
      </button>
      <button
        style={S.button(mode === "live", false)}
        onClick={() => onChange("live")}
        aria-pressed={mode === "live"}
        id="demo-mode-live"
        type="button"
        title="Run with a live AI provider"
      >
        <span style={S.dot(mode === "live", "#fb923c")} aria-hidden />
        Live Runtime
      </button>
    </div>
  );
}
