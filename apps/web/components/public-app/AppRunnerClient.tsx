/**
 * AppRunnerClient — "use client" component that manages interactive state
 * for the public app runner page at /a/[slug].
 *
 * Receives resolved, sanitized contract data as props from the server component.
 * Manages: form state, run submission, output display, error handling.
 *
 * Architecture:
 * - For type="casepack": renders DynamicForm + OutputCard directly.
 * - For type="graph": delegates entirely to CompositeAppRenderer.
 * - CompositeAppRenderer manages graph form, GraphStepper, and OutputCard.
 * - API calls are injected as callbacks — no direct fetch() in child components.
 *
 * ISOLATION:
 * - Does NOT call registry APIs or read casepack_json directly.
 * - All contract data is pre-resolved and sanitized server-side.
 * - Submits runs to public endpoints only.
 */

"use client";

import React, { useState, useCallback } from "react";
import {
  DynamicForm,
  OutputCard,
  CompositeAppRenderer,
} from "@cognitive-forge/ui-forge";
import type { FormValues, OutputValue, PublicGraphRunResult } from "@cognitive-forge/ui-forge";
import { PROutputPackage } from "./PROutputPackage";
import { AITrainingOutputPackage } from "./AITrainingOutputPackage";
import type { InputContract, OutputContract, UISchema } from "@cognitive-forge/core";

// ── Types ─────────────────────────────────────────────────────────────────────

export type RunState = "idle" | "running" | "complete" | "error";

/** Sanitized graph node (id + label only — no casepack_key exposed). */
export interface PublicGraphNode {
  id:    string;
  label: string;
}

export interface AppRunnerClientProps {
  slug:            string;
  title:           string;
  description?:    string | null | undefined;
  appType:         "casepack" | "graph";
  inputContract:   InputContract;
  outputContract:  OutputContract;
  uiSchema?:       UISchema | null | undefined;
  graphNodes?:     PublicGraphNode[] | undefined;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  page: {
    minHeight:     "100vh",
    display:       "flex",
    flexDirection: "column" as const,
    alignItems:    "center",
    padding:       "2.5rem 1rem 4rem",
    background:    "var(--color-forge-900, #0a0a0f)",
  },
  container: {
    width:         "100%",
    maxWidth:      "48rem",
    display:       "flex",
    flexDirection: "column" as const,
    gap:           "2rem",
  },
  header: {
    display:       "flex",
    flexDirection: "column" as const,
    gap:           "0.5rem",
  },
  title: {
    fontSize:   "1.75rem",
    fontWeight: 700,
    color:      "var(--color-forge-text, #e8e8f0)",
    margin:     0,
    lineHeight: 1.2,
  },
  description: {
    fontSize:   "1rem",
    color:      "var(--color-forge-muted, #9090a8)",
    margin:     0,
    lineHeight: 1.5,
  },
  typeBadge: (appType: string) => ({
    display:       "inline-flex",
    alignItems:    "center",
    gap:           "0.375rem",
    width:         "fit-content",
    padding:       "0.25rem 0.75rem",
    borderRadius:  "9999px",
    fontSize:      "0.75rem",
    fontWeight:    600,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
    background:    appType === "graph"
      ? "rgba(52, 211, 153, 0.12)"
      : "rgba(108, 99, 255, 0.12)",
    color:         appType === "graph"
      ? "#34d399"
      : "var(--color-forge-accent, #6c63ff)",
    border: `1px solid ${appType === "graph" ? "rgba(52, 211, 153, 0.25)" : "rgba(108, 99, 255, 0.25)"}`,
  }),
  formCard: {
    background:   "var(--color-forge-700, #1e1e30)",
    border:       "1px solid var(--color-forge-border, #2a2a42)",
    borderRadius: "0.875rem",
    padding:      "1.5rem",
  },
} as const;

// ── Graph submit callback factory ─────────────────────────────────────────────

function makeGraphSubmitFn(slug: string) {
  return async (input: FormValues): Promise<PublicGraphRunResult> => {
    const res = await fetch(`/api/public/apps/${slug}/graph-run`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ input }),
    });

    const json = await res.json() as Record<string, unknown>;

    if (!res.ok) {
      const err = json["error"] as { message?: string } | undefined;
      throw new Error(err?.message ?? `Request failed (${res.status})`);
    }

    const data = json["data"] as PublicGraphRunResult | undefined;
    if (!data) {
      throw new Error("Invalid response from server. Please try again.");
    }
    return data;
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AppRunnerClient({
  slug,
  title,
  description,
  appType,
  inputContract,
  outputContract,
  uiSchema,
  graphNodes,
}: AppRunnerClientProps) {
  // ── CasePack-only state (graph uses CompositeAppRenderer) ─────────────────
  const [formState,  setFormState]  = useState<FormValues>(() => {
    const initial: FormValues = {};
    for (const field of inputContract.fields) {
      if (field.default_value !== undefined) {
        initial[field.key] = field.default_value;
      }
    }
    return initial;
  });

  const [runState,  setRunState]  = useState<RunState>("idle");
  const [runOutput, setRunOutput] = useState<Record<string, OutputValue>>({});
  const [runError,  setRunError]  = useState<string | undefined>(undefined);

  const handleFieldChange = useCallback((key: string, value: FormValues[string]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleCasepackSubmit = useCallback(async (values: FormValues) => {
    setRunState("running");
    setRunError(undefined);
    setRunOutput({});

    try {
      const res = await fetch(`/api/public/apps/${slug}/run`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ input: values }),
      });

      const json = await res.json() as Record<string, unknown>;

      if (!res.ok) {
        const err = json["error"] as { message?: string; code?: string } | undefined;
        setRunState("error");
        setRunError(err?.message ?? `Request failed (${res.status})`);
        return;
      }

      const data = json["data"] as Record<string, unknown> | undefined;
      if (data?.["output"]) {
        setRunOutput(data["output"] as Record<string, OutputValue>);
      }
      setRunState("complete");
    } catch (e) {
      setRunState("error");
      setRunError(e instanceof Error ? e.message : "An unexpected error occurred");
    }
  }, [slug]);

  // ── Graph app branch — delegate to CompositeAppRenderer ──────────────────
  if (appType === "graph") {
    const graphSubmitFn = makeGraphSubmitFn(slug);
    return (
      <div style={S.page}>
        <div style={S.container}>
          {/* Header */}
          <div style={S.header}>
            <div style={S.typeBadge(appType)}>
              ⟐ Graph App
            </div>
            <h1 style={S.title}>{title}</h1>
            {description && <p style={S.description}>{description}</p>}
          </div>

          {/* Composite renderer handles stepper + form + output */}
          <CompositeAppRenderer
            slug={slug}
            title={title}
            description={description}
            inputContract={inputContract}
            outputContract={outputContract}
            {...(uiSchema ? { uiSchema } : {})}
            graphNodes={graphNodes ?? []}
            onSubmit={graphSubmitFn}
            renderOutput={
              slug === "corporate-pr-suite" 
                ? (props) => <PROutputPackage status={props.status} finalOutput={props.finalOutput} />
                : slug === "ai-training-practice-suite"
                ? (props) => <AITrainingOutputPackage status={props.status} finalOutput={props.finalOutput} />
                : undefined
            }
          />
        </div>
      </div>
    );
  }

  // ── CasePack app branch ────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <div style={S.container}>
        {/* Header */}
        <div style={S.header}>
          <div style={S.typeBadge(appType)}>
            ◆ Micro App
          </div>
          <h1 style={S.title}>{title}</h1>
          {description && <p style={S.description}>{description}</p>}
        </div>

        {/* Input form */}
        <div style={S.formCard}>
          <DynamicForm
            inputContract={inputContract}
            {...(uiSchema ? { uiSchema } : {})}
            formState={formState}
            onFieldChange={handleFieldChange}
            onSubmit={handleCasepackSubmit}
            submitting={runState === "running"}
          />
        </div>

        {/* Output */}
        <OutputCard
          outputContract={outputContract}
          values={runOutput}
          publicMode={true}
          status={runState}
          {...(runError !== undefined ? { errorMessage: runError } : {})}
        />
      </div>
    </div>
  );
}
