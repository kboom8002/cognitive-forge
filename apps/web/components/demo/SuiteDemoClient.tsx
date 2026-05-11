/**
 * SuiteDemoClient — "use client" component that manages the full interactive
 * demo lifecycle for a single suite on /demo/apps/[slug].
 *
 * Manages: demo mode (static / live), run state, step animation, output.
 * Renders all demo sub-components and wires them together.
 *
 * Rules:
 * - Static mode uses only fixture data — no API, no runtime.
 * - Live mode calls the public graph-run endpoint via demo-runtime-adapter.
 * - deepSanitize is applied to all live responses (defence-in-depth).
 * - Does NOT expose raw internals.
 */

"use client";

import React, { useState, useCallback } from "react";
import type { DemoSuite } from "../../app/demo/_lib/demo-registry";
import { runLiveDemo } from "../../app/demo/_lib/demo-runtime-adapter";
import type { LiveRunResult } from "../../app/demo/_lib/demo-runtime-adapter";
import { SuiteOverviewPanel }      from "./SuiteOverviewPanel";
import { SuiteInputForm }          from "./SuiteInputForm";
import { CasePackGraphVisualizer } from "./CasePackGraphVisualizer";
import { BridgeHandoffPanel }      from "./BridgeHandoffPanel";
import { RuntimeTraceTimeline }    from "./RuntimeTraceTimeline";
import { SuiteOutputPreview }      from "./SuiteOutputPreview";
import { DemoAppLauncher }         from "./DemoAppLauncher";
import { DemoModeToggle }          from "./DemoModeToggle";
import type { DemoMode }           from "./DemoModeToggle";

interface SuiteDemoClientProps {
  suite: DemoSuite;
}

const S = {
  page: {
    minHeight:     "100vh",
    background:    "#0a0a0f",
    padding:       "0 1rem 4rem",
  },
  topBar: {
    maxWidth:      "72rem",
    margin:        "0 auto",
    padding:       "1.5rem 0 0",
    display:       "flex",
    alignItems:    "center",
    justifyContent:"space-between" as const,
    gap:           "1rem",
    flexWrap:      "wrap" as const,
  },
  breadcrumb: {
    display:    "flex",
    alignItems: "center",
    gap:        "0.375rem",
    fontSize:   "0.875rem",
    color:      "#9090a8",
  },
  breadcrumbLink: {
    color:          "#6c63ff",
    textDecoration: "none",
    fontWeight:     500,
  },
  breadcrumbSep: {
    color: "#2a2a42",
  },
  breadcrumbCurrent: {
    color: "#e8e8f0",
    fontWeight: 600,
  },
  container: {
    maxWidth: "72rem",
    margin:   "0 auto",
    padding:  "1.5rem 0",
    display:  "flex",
    flexDirection: "column" as const,
    gap:      "1.5rem",
  },
  twoCol: {
    display:             "grid",
    gridTemplateColumns: "1fr 1.5fr",
    gap:                 "1.25rem",
    alignItems:          "flex-start",
  },
  leftCol: {
    display:       "flex",
    flexDirection: "column" as const,
    gap:           "1.25rem",
  },
  rightCol: {
    display:       "flex",
    flexDirection: "column" as const,
    gap:           "1.25rem",
  },
  inputCard: {
    padding:      "1.5rem",
    background:   "#13131f",
    border:       "1px solid #2a2a42",
    borderRadius: "0.875rem",
    display:      "flex",
    flexDirection:"column" as const,
    gap:          "1.25rem",
  },
  liveRuntimeCard: {
    padding:      "1.25rem 1.5rem",
    background:   "rgba(251, 146, 60, 0.04)",
    border:       "1px solid rgba(251, 146, 60, 0.2)",
    borderRadius: "0.875rem",
    display:      "flex",
    alignItems:   "flex-start",
    gap:          "1rem",
  },
  liveIcon: {
    fontSize:   "1.5rem",
    lineHeight: 1,
    flexShrink: 0,
  },
  liveContent: {
    display:       "flex",
    flexDirection: "column" as const,
    gap:           "0.25rem",
  },
  liveTitle: {
    fontSize:   "0.9375rem",
    fontWeight: 700,
    color:      "#fb923c",
    margin:     0,
  },
  liveDesc: {
    fontSize:   "0.875rem",
    color:      "#9090a8",
    lineHeight: 1.55,
    margin:     0,
  },
  launcherRow: {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "space-between" as const,
    flexWrap:       "wrap" as const,
    gap:            "1rem",
  },
  divider: {
    height:     "1px",
    background: "#2a2a42",
  },
  errorBanner: {
    padding:      "1rem 1.25rem",
    background:   "rgba(239, 68, 68, 0.08)",
    border:       "1px solid rgba(239, 68, 68, 0.25)",
    borderRadius: "0.625rem",
    color:        "#f87171",
    fontSize:     "0.875rem",
    lineHeight:   1.5,
  },
  loadingBanner: {
    padding:      "1rem 1.25rem",
    background:   "rgba(251, 146, 60, 0.08)",
    border:       "1px solid rgba(251, 146, 60, 0.25)",
    borderRadius: "0.625rem",
    color:        "#fb923c",
    fontSize:     "0.875rem",
    lineHeight:   1.5,
    display:      "flex",
    alignItems:   "center",
    gap:          "0.5rem",
  },
} as const;

export function SuiteDemoClient({ suite }: SuiteDemoClientProps): React.ReactElement {
  // ── Form state ─────────────────────────────────────────────────────────────
  const [formValues, setFormValues] = useState<Record<string, string>>(() => ({ ...suite.sampleInput }));
  const handleFieldChange = useCallback((key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ── Run state ──────────────────────────────────────────────────────────────
  const [demoMode,       setDemoMode]       = useState<DemoMode>("static");
  const [completedCount, setCompletedCount] = useState(0);
  const [isRunning,      setIsRunning]      = useState(false);
  const [isComplete,     setIsComplete]     = useState(false);

  // ── Live mode state ────────────────────────────────────────────────────────
  const [liveOutput,  setLiveOutput]  = useState<Record<string, string> | null>(null);
  const [liveError,   setLiveError]   = useState<string | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);

  const completedNodes = suite.nodes
    .slice(0, completedCount)
    .map((n) => n.id);

  const activeNode = isRunning && completedCount < suite.nodes.length
    ? suite.nodes[completedCount]?.id
    : undefined;

  const handleStepComplete = useCallback((stepIndex: number) => {
    setIsRunning(true);
    setCompletedCount(stepIndex + 1);
  }, []);

  const handleRunComplete = useCallback(() => {
    setIsRunning(false);
    setIsComplete(true);
    setCompletedCount(suite.nodes.length);
  }, [suite.nodes.length]);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setIsComplete(false);
    setCompletedCount(0);
    setLiveOutput(null);
    setLiveError(null);
    setLiveLoading(false);
  }, []);

  // ── Live runtime handler ───────────────────────────────────────────────────
  const handleLiveRun = useCallback(async () => {
    if (liveLoading || isComplete) return;
    setLiveLoading(true);
    setLiveError(null);
    setLiveOutput(null);
    setIsRunning(true);

    try {
      const result: LiveRunResult = await runLiveDemo(suite, formValues);
      if (result.status === "error") {
        setLiveError(result.error ?? "Live runtime unavailable");
        setIsRunning(false);
      } else {
        setLiveOutput(result.output);
        setIsComplete(true);
        setIsRunning(false);
        setCompletedCount(suite.nodes.length);
      }
    } catch (err: any) {
      setLiveError(`Live runtime unavailable: ${err?.message ?? "Unknown error"}`);
      setIsRunning(false);
    } finally {
      setLiveLoading(false);
    }
  }, [liveLoading, isComplete, suite, formValues]);

  // ── Mode change handler ────────────────────────────────────────────────────
  const handleModeChange = useCallback((mode: DemoMode) => {
    setDemoMode(mode);
    // Reset state when switching modes
    handleReset();
  }, [handleReset]);

  // ── Determine which output to display ──────────────────────────────────────
  const displayOutput = demoMode === "live" && liveOutput
    ? liveOutput
    : suite.sampleOutput;

  const showOutput = demoMode === "live"
    ? isComplete && liveOutput !== null
    : isComplete;

  return (
    <div style={S.page}>
      {/* ── Top navigation ─────────────────────────────────────────────── */}
      <div style={S.topBar}>
        <nav style={S.breadcrumb} aria-label="Breadcrumb">
          <a href="/demo" style={S.breadcrumbLink}>Demo</a>
          <span style={S.breadcrumbSep} aria-hidden>/</span>
          <a href="/demo/apps" style={S.breadcrumbLink}>Apps</a>
          <span style={S.breadcrumbSep} aria-hidden>/</span>
          <span style={S.breadcrumbCurrent} aria-current="page">{suite.title}</span>
        </nav>
        <DemoModeToggle mode={demoMode} onChange={handleModeChange} />
      </div>

      <div style={S.container}>
        {/* ── Suite overview ─────────────────────────────────────────────── */}
        <SuiteOverviewPanel suite={suite} />

        {/* ── Pipeline graph ─────────────────────────────────────────────── */}
        <CasePackGraphVisualizer
          nodes={suite.nodes}
          edges={suite.edges}
          completedNodes={completedNodes}
          activeNode={activeNode}
          accentColor={suite.accentColor}
        />

        {/* ── Launch bar ─────────────────────────────────────────────────── */}
        <div style={S.launcherRow}>
          {demoMode === "static" ? (
            <DemoAppLauncher
              appSlug={suite.appSlug}
              appTitle={suite.title}
              stepCount={suite.stepCount}
              accentColor={suite.accentColor}
              onStepComplete={handleStepComplete}
              onRunComplete={handleRunComplete}
              onReset={handleReset}
              isRunning={isRunning}
              isComplete={isComplete}
            />
          ) : (
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" as const }}>
              <button
                style={{
                  display:      "inline-flex",
                  alignItems:   "center",
                  gap:          "0.5rem",
                  padding:      "0.6875rem 1.5rem",
                  borderRadius: "0.625rem",
                  fontSize:     "0.9375rem",
                  fontWeight:   700,
                  cursor:       liveLoading ? "wait" : "pointer",
                  border:       "none",
                  transition:   "all 0.2s",
                  background:   isComplete
                    ? "rgba(52, 211, 153, 0.15)"
                    : liveLoading
                    ? "rgba(251, 146, 60, 0.2)"
                    : "linear-gradient(135deg, #fb923c, #f97316)",
                  color:        isComplete ? "#34d399" : liveLoading ? "#fb923c" : "#fff",
                  boxShadow:    liveLoading || isComplete ? "none" : "0 4px 14px rgba(251, 146, 60, 0.3)",
                  opacity:      liveLoading ? 0.85 : 1,
                }}
                onClick={handleLiveRun}
                disabled={liveLoading || isComplete}
                id="demo-live-run-button"
                type="button"
                aria-label={isComplete ? "Live run complete" : liveLoading ? "Running live…" : "Run live demo"}
              >
                {isComplete ? "✓ Live Run Complete" : liveLoading ? "⏳ Running live…" : "⚡ Run Live"}
              </button>
              {(isComplete || liveError) && (
                <button
                  style={{
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
                  }}
                  onClick={handleReset}
                  id="demo-live-reset-button"
                  type="button"
                >
                  ↺ Reset
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Live loading indicator ─────────────────────────────────────── */}
        {liveLoading && (
          <div style={S.loadingBanner} role="status" aria-live="polite">
            <span aria-hidden>⏳</span>
            Running live runtime — this may take 10-30 seconds depending on the pipeline…
          </div>
        )}

        {/* ── Live error banner ──────────────────────────────────────────── */}
        {liveError && (
          <div style={S.errorBanner} role="alert">
            {liveError}
          </div>
        )}

        <div style={S.divider} aria-hidden />

        {/* ── Two-column layout: input + trace | output ─────────────────── */}
        <div style={S.twoCol}>
          <div style={S.leftCol}>
            {/* Input form */}
            <div style={S.inputCard}>
              <SuiteInputForm
                fields={suite.inputFields}
                values={formValues}
                onChange={handleFieldChange}
                disabled={isRunning || isComplete}
              />
            </div>

            {/* Runtime trace */}
            <RuntimeTraceTimeline
              events={suite.traceTimeline}
              completedSteps={completedCount}
              accentColor={suite.accentColor}
            />

            {/* Bridge handoffs */}
            <BridgeHandoffPanel edges={suite.edges} />
          </div>

          <div style={S.rightCol}>
            {/* Output preview */}
            <SuiteOutputPreview
              outputFields={suite.outputFields}
              sampleOutput={displayOutput}
              isVisible={showOutput}
              accentColor={suite.accentColor}
            />

            {/* Live runtime info card */}
            <div style={S.liveRuntimeCard} role="note" aria-label="Live Runtime info">
              <span style={S.liveIcon} aria-hidden>⚡</span>
              <div style={S.liveContent}>
                <h3 style={S.liveTitle}>Live Runtime Mode</h3>
                <p style={S.liveDesc}>
                  {demoMode === "static"
                    ? <>Switch to Live Runtime mode above to run this suite with a real AI model, or visit{" "}
                        <a href={`/a/${suite.appSlug}`} style={{ color: "#fb923c" }}>/a/{suite.appSlug}</a>.</>
                    : <>Connected to the live runtime. Output is generated by a real AI model and sanitized before display.</>
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
