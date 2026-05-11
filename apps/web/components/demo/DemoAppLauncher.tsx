/**
 * DemoAppLauncher — Runs the static demo simulation and links to the live app.
 * "Run Demo" button triggers a step-by-step simulated animation.
 * "Open App" links to /a/[slug] for the real live version.
 *
 * "use client" — manages animation state.
 */

"use client";

import React, { useState, useCallback, useRef } from "react";

interface DemoAppLauncherProps {
  appSlug:      string;
  appTitle:     string;
  stepCount:    number;
  accentColor:  string;
  onStepComplete: (stepIndex: number) => void;
  onRunComplete:  () => void;
  onReset:        () => void;
  isRunning:      boolean;
  isComplete:     boolean;
}

const S = {
  wrapper: {
    display:      "flex",
    alignItems:   "center",
    gap:          "0.75rem",
    flexWrap:     "wrap" as const,
  },
  runButton: (isRunning: boolean, isComplete: boolean, accentColor: string) => ({
    display:      "inline-flex",
    alignItems:   "center",
    gap:          "0.5rem",
    padding:      "0.6875rem 1.5rem",
    borderRadius: "0.625rem",
    fontSize:     "0.9375rem",
    fontWeight:   700,
    cursor:       isRunning ? "wait" : "pointer",
    border:       "none",
    transition:   "all 0.2s",
    background:   isComplete
      ? "rgba(52, 211, 153, 0.15)"
      : isRunning
      ? `${accentColor}33`
      : `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
    color:        isComplete ? "#34d399" : isRunning ? accentColor : "#fff",
    boxShadow:    isRunning || isComplete ? "none" : `0 4px 14px ${accentColor}40`,
    opacity:      isRunning ? 0.85 : 1,
  }),
  resetButton: {
    display:      "inline-flex",
    alignItems:   "center",
    gap:          "0.375rem",
    padding:      "0.6875rem 1rem",
    borderRadius: "0.625rem",
    fontSize:     "0.875rem",
    fontWeight:   600,
    cursor:       "pointer",
    border:       "1px solid #2a2a42",
    background:   "transparent",
    color:        "#9090a8",
    transition:   "all 0.15s",
  },
  openButton: {
    display:      "inline-flex",
    alignItems:   "center",
    gap:          "0.375rem",
    padding:      "0.6875rem 1rem",
    borderRadius: "0.625rem",
    fontSize:     "0.875rem",
    fontWeight:   600,
    cursor:       "pointer",
    border:       "1px solid #2a2a42",
    background:   "transparent",
    color:        "#9090a8",
    textDecoration:"none",
    transition:   "all 0.15s",
  },
  liveNote: {
    fontSize:  "0.8125rem",
    color:     "#9090a8",
    fontStyle: "italic",
  },
} as const;

export function DemoAppLauncher({
  appSlug,
  stepCount,
  accentColor,
  onStepComplete,
  onRunComplete,
  onReset,
  isRunning,
  isComplete,
}: DemoAppLauncherProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRun = useCallback(() => {
    if (isRunning || isComplete) return;

    let step = 0;
    const STEP_DELAY = 600;

    function runNextStep() {
      onStepComplete(step);
      step += 1;
      if (step < stepCount) {
        timerRef.current = setTimeout(runNextStep, STEP_DELAY);
      } else {
        timerRef.current = setTimeout(onRunComplete, STEP_DELAY);
      }
    }

    timerRef.current = setTimeout(runNextStep, 300);
  }, [isRunning, isComplete, stepCount, onStepComplete, onRunComplete]);

  const handleReset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    onReset();
  }, [onReset]);

  return (
    <div style={S.wrapper}>
      <button
        style={S.runButton(isRunning, isComplete, accentColor)}
        onClick={handleRun}
        disabled={isRunning || isComplete}
        id="demo-run-button"
        type="button"
        aria-label={isComplete ? "Demo complete" : isRunning ? "Running demo…" : "Run static demo"}
      >
        {isComplete ? "✓ Demo Complete" : isRunning ? "⏳ Running…" : "▶ Run Demo"}
      </button>

      {(isRunning || isComplete) && (
        <button
          style={S.resetButton}
          onClick={handleReset}
          id="demo-reset-button"
          type="button"
        >
          ↺ Reset
        </button>
      )}

      <a
        href={`/a/${appSlug}`}
        style={S.openButton}
        id="demo-open-app-link"
        target="_blank"
        rel="noopener noreferrer"
      >
        Open Live App ↗
      </a>
    </div>
  );
}
