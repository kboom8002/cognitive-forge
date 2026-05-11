/**
 * CompositeAppRenderer — renders the full interactive lifecycle of a graph app.
 *
 * Manages: form → submission → GraphStepper progress → final OutputCard.
 *
 * Architecture:
 * - Fully controlled by the parent via callback props (onSubmit, onPoll).
 * - All API calls are executed by the parent (AppRunnerClient / page).
 *   This component NEVER calls fetch() directly.
 * - Step progress is derived from `completedNodes` returned by the API.
 * - Raw node outputs and bridge payloads are NEVER received or rendered.
 * - publicMode is always applied to the final OutputCard.
 *
 * Step status derivation:
 * - If the run is "running": the first incomplete step is "active", rest "pending".
 * - After completion: steps in completedNodes are "complete".
 * - On failure/partial: completed steps are "complete", first non-completed is "failed".
 *
 * ISOLATION: must NOT import @cognitive-forge/runtime or any server module.
 */

import React, { useState, useCallback } from "react";
import { RuntimeTraceTimeline } from "../trace/RuntimeTraceTimeline";
import type { InputContract, OutputContract, UISchema } from "@cognitive-forge/core";
import { BuilderInspectionPanel } from "../builder/BuilderInspectionPanel";
import type { BuilderInspectionSummary } from "../builder/BuilderInspectionPanel";
import { DynamicForm } from "../form-renderer/DynamicForm";
import type { FormValues } from "../form-renderer/DynamicForm";
import { OutputCard } from "../output-renderer/OutputCard";
import type { OutputValue } from "../output-renderer/OutputFieldRenderer";
import { GraphStepper } from "../progress/GraphStepper";
import type { GraphStep } from "../progress/GraphStepper";

// ── Types ─────────────────────────────────────────────────────────────────────

/** The sanitized result returned from POST /api/public/apps/:slug/graph-run. */
export interface PublicGraphRunResult {
  graph_run_id:         string;
  status:               "success" | "failed" | "partial";
  final_output:         Record<string, unknown>;
  validation:           { status: string };
  completed_nodes:      string[];
  progress_label?:      string;
  validation_status:    string;
  trace_summary?:       any[];
  builder_summary?:     any;
}

export type CompositeRunState = "idle" | "running" | "complete" | "error" | "partial";

/** Safe graph node for display (id + label only). */
export interface PublicGraphNode {
  id:    string;
  label: string;
}

export interface CompositeAppRendererProps {
  // ── App identity ───────────────────────────────────────────────────────────
  slug:            string;
  title:           string;
  description?:    string | null | undefined;

  // ── Contracts ──────────────────────────────────────────────────────────────
  inputContract:   InputContract;
  outputContract:  OutputContract;
  uiSchema?:       UISchema | null | undefined;

  // ── Graph topology (safe: id + label only) ─────────────────────────────────
  graphNodes:      PublicGraphNode[];

  // ── API callbacks — the parent is responsible for fetching ─────────────────
  /**
   * Called when the user submits the form.
   * Must POST to /api/public/apps/:slug/graph-run and resolve with result.
   * On error, reject with a user-friendly message.
   */
  onSubmit: (input: FormValues) => Promise<PublicGraphRunResult>;
  
  // ── Optional Overrides ─────────────────────────────────────────────────────
  /** Custom renderer for the final output. If provided, replaces OutputCard. */
  renderOutput?: ((props: { status: CompositeRunState; finalOutput: Record<string, OutputValue> }) => React.ReactNode) | undefined;
  
  /** Controls visibility of builder inspection panels. Defaults to true. */
  publicMode?: boolean | undefined;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  wrapper: {
    display:       "flex",
    flexDirection: "column" as const,
    gap:           "1.5rem",
  },
  formCard: {
    background:   "var(--color-forge-700, #1e1e30)",
    border:       "1px solid var(--color-forge-border, #2a2a42)",
    borderRadius: "0.875rem",
    padding:      "1.5rem",
  },
  partialBanner: {
    display:      "flex",
    alignItems:   "center",
    gap:          "0.625rem",
    padding:      "0.75rem 1rem",
    background:   "rgba(251, 191, 36, 0.08)",
    border:       "1px solid rgba(251, 191, 36, 0.25)",
    borderRadius: "0.625rem",
    color:        "#fbbf24",
    fontSize:     "0.875rem",
  },
} as const;

// ── Step status derivation ────────────────────────────────────────────────────

function deriveSteps(
  graphNodes:     PublicGraphNode[],
  runState:       CompositeRunState,
  completedNodes: string[],
): GraphStep[] {
  const completedSet = new Set(completedNodes);
  const firstIncompleteIdx = graphNodes.findIndex((n) => !completedSet.has(n.id));

  return graphNodes.map((node, i) => {
    if (completedSet.has(node.id)) {
      return { id: node.id, label: node.label, status: "complete" as const };
    }
    if (runState === "running" && i === firstIncompleteIdx) {
      return { id: node.id, label: node.label, status: "active" as const };
    }
    if ((runState === "error" || runState === "partial") && i === firstIncompleteIdx) {
      return { id: node.id, label: node.label, status: "failed" as const };
    }
    return { id: node.id, label: node.label, status: "pending" as const };
  });
}

// ── Map CompositeRunState to GraphStepper runStatus ──────────────────────────

function toStepperRunStatus(runState: CompositeRunState): "idle" | "running" | "complete" | "error" | "partial" {
  return runState;
}

// ── Map CompositeRunState to OutputCard status ────────────────────────────────

function toOutputStatus(runState: CompositeRunState): "idle" | "running" | "complete" | "error" {
  if (runState === "partial") return "complete";   // show whatever was produced
  return runState;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CompositeAppRenderer({
  title,
  inputContract,
  outputContract,
  uiSchema,
  graphNodes,
  onSubmit,
  renderOutput,
  publicMode = true,
}: CompositeAppRendererProps): React.ReactElement {
  // ── Form state ─────────────────────────────────────────────────────────────
  const [formState, setFormState] = useState<FormValues>(() => {
    const initial: FormValues = {};
    for (const field of inputContract.fields) {
      if (field.default_value !== undefined) {
        initial[field.key] = field.default_value;
      }
    }
    return initial;
  });

  // ── Run state ──────────────────────────────────────────────────────────────
  const [runState,        setRunState]        = useState<CompositeRunState>("idle");
  const [completedNodes,  setCompletedNodes]  = useState<string[]>([]);
  const [progressLabel,   setProgressLabel]   = useState<string | undefined>(undefined);
  const [finalOutput,     setFinalOutput]     = useState<Record<string, OutputValue>>({});
  const [errorMessage,    setErrorMessage]    = useState<string | undefined>(undefined);
  const [apiRunStatus,    setApiRunStatus]    = useState<PublicGraphRunResult["status"] | undefined>(undefined);
  const [traceSummaries,  setTraceSummaries]  = useState<any[]>([]);
  const [builderSummary,  setBuilderSummary]  = useState<any>(undefined);

  const handleFieldChange = useCallback((key: string, value: FormValues[string]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = useCallback(async (values: FormValues) => {
    setRunState("running");
    setErrorMessage(undefined);
    setFinalOutput({});
    setCompletedNodes([]);
    setProgressLabel("Starting graph run…");

    // Simulate per-node progress during execution by marking steps active
    // as the run progresses. The actual progress comes from the API response.
    try {
      const result = await onSubmit(values);

      setApiRunStatus(result.status);
      setCompletedNodes(result.completed_nodes);
      setProgressLabel(result.progress_label);
      setFinalOutput(result.final_output as Record<string, OutputValue>);
      setTraceSummaries(result.trace_summary ?? []);
      setBuilderSummary(result.builder_summary);

      if (result.status === "success") {
        setRunState("complete");
      } else if (result.status === "partial") {
        setRunState("partial");
      } else {
        setRunState("error");
        setErrorMessage(result.progress_label ?? "The graph run failed. Please try again.");
      }
    } catch (e) {
      setRunState("error");
      setErrorMessage(e instanceof Error ? e.message : "An unexpected error occurred. Please try again.");
      setProgressLabel("Graph run failed.");
    }
  }, [onSubmit]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const steps        = deriveSteps(graphNodes, runState, completedNodes);
  const showStepper  = runState !== "idle" || graphNodes.length > 0;
  const showOutput   = runState !== "idle";
  const isPartial    = runState === "partial";

  // For the OutputCard: show whatever final_output was returned (could be partial)
  const outputStatus = toOutputStatus(runState);
  const outputLabel  = `${title} — Final Output`;

  return (
    <div style={S.wrapper} data-testid="composite-app-renderer">
      {/* ── Graph step indicator ─────────────────────────────────────────── */}
      {showStepper && (
        <GraphStepper
          steps={steps}
          progressLabel={progressLabel}
          runStatus={toStepperRunStatus(runState)}
        />
      )}

      {/* ── Trace Timeline ───────────────────────────────────────────────── */}
      {traceSummaries.length > 0 && (
        <RuntimeTraceTimeline summaries={traceSummaries} isBuilderMode={!publicMode} />
      )}

      {/* ── Input form ───────────────────────────────────────────────────── */}
      <div style={S.formCard}>
        <DynamicForm
          inputContract={inputContract}
          {...(uiSchema ? { uiSchema } : {})}
          formState={formState}
          onFieldChange={handleFieldChange}
          onSubmit={handleSubmit}
          submitting={runState === "running"}
          disabled={runState === "running"}
        />
      </div>

      {/* ── Partial result banner ─────────────────────────────────────────── */}
      {isPartial && (
        <div
          style={S.partialBanner}
          role="alert"
          data-testid="partial-result-banner"
        >
          <span aria-hidden>⚠</span>
          <span>
            Graph run partially completed — {apiRunStatus && completedNodes.length} step
            {completedNodes.length !== 1 ? "s" : ""} finished.
            The output below is from the last completed step.
          </span>
        </div>
      )}

      {/* ── Final output card ─────────────────────────────────────────────── */}
      {showOutput && (
        renderOutput ? (
          renderOutput({ status: outputStatus, finalOutput })
        ) : (
          <OutputCard
            outputContract={outputContract}
            values={finalOutput}
            publicMode={publicMode}
            status={outputStatus}
            nodeLabel={outputLabel}
            {...(errorMessage !== undefined ? { errorMessage } : {})}
          />
        )
      )}

      {/* ── Builder Inspection Panel ──────────────────────────────────────── */}
      {builderSummary && !publicMode && (
        <BuilderInspectionPanel summary={builderSummary} publicMode={publicMode} />
      )}
    </div>
  );
}
