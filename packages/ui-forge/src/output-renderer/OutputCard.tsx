/**
 * OutputCard — renders an OutputContract result.
 *
 * Key behaviours:
 * - Renders fields in output_contract.fields[] declared order.
 * - publicMode=true: only renders fields listed in output_contract.public_fields.
 *   Fields NOT in public_fields are silently omitted — never exposed.
 * - Renders arrays and objects safely via OutputFieldRenderer.
 * - Handles empty/loading/error states.
 * - Optional nodeLabel for graph step headings.
 *
 * ISOLATION: must NOT import @cognitive-forge/runtime or any server module.
 */

import React from "react";
import type { OutputContract } from "@cognitive-forge/core";
import { OutputFieldRenderer } from "./OutputFieldRenderer";
import type { OutputValue } from "./OutputFieldRenderer";
import { TrustSignalPanel } from "./TrustSignalPanel";
import { OutputActions } from "./OutputActions";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OutputCardProps {
  /** The output contract from the resolved CasePack. */
  outputContract: OutputContract;
  /** The values produced by the AI run — keyed by FieldDef.key. */
  values: Record<string, OutputValue>;
  /**
   * When true, only fields listed in outputContract.public_fields are rendered.
   * Unlisted fields are silently dropped — they are never sent to the component
   * from the public API, but this prop ensures defence in depth.
   */
  publicMode?: boolean | undefined;
  /** Optional heading shown above the output fields (e.g. graph node label). */
  nodeLabel?: string | undefined;
  /** Optional status indicator. */
  status?: "idle" | "running" | "complete" | "error" | undefined;
  /** Error message to display when status="error". */
  errorMessage?: string | undefined;
  /** Optional callback triggered when the user clicks 'Copy'. */
  onCopy?: (() => void) | undefined;
  /** Optional callback triggered when the user clicks 'Download'. */
  onDownload?: (() => void) | undefined;
  /** Trust signals reflecting the quality of the output. */
  trustSignals?: any | undefined;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  card: {
    background: "var(--color-forge-700, #1e1e30)",
    border: "1px solid var(--color-forge-border, #2a2a42)",
    borderRadius: "0.875rem",
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column" as const,
    gap: "1.5rem",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    flexWrap: "wrap",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  actionsRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  actionBtn: {
    background: "transparent",
    border: "1px solid var(--color-forge-border, #2a2a42)",
    borderRadius: "0.375rem",
    padding: "0.375rem 0.75rem",
    color: "var(--color-forge-text, #e8e8f0)",
    fontSize: "0.8125rem",
    fontWeight: 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.375rem",
    transition: "background 0.15s, border-color 0.15s",
  },
  nodeLabel: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "var(--color-forge-text, #e8e8f0)",
  },
  statusBadge: (status: string) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
    padding: "0.1875rem 0.625rem",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: 500,
    background:
      status === "complete" ? "rgba(52, 211, 153, 0.15)" :
      status === "running"  ? "rgba(108, 99, 255, 0.15)" :
      status === "error"    ? "rgba(248, 113, 113, 0.15)" :
      "rgba(144, 144, 168, 0.1)",
    color:
      status === "complete" ? "#34d399" :
      status === "running"  ? "var(--color-forge-accent, #6c63ff)" :
      status === "error"    ? "#f87171" :
      "var(--color-forge-muted, #9090a8)",
    border: `1px solid ${
      status === "complete" ? "rgba(52, 211, 153, 0.3)" :
      status === "running"  ? "rgba(108, 99, 255, 0.3)" :
      status === "error"    ? "rgba(248, 113, 113, 0.3)" :
      "var(--color-forge-border, #2a2a42)"
    }`,
  }),
  statusDot: {
    width: "0.4rem",
    height: "0.4rem",
    borderRadius: "50%",
    background: "currentColor",
  },
  fields: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "1.5rem",
  },
  emptyState: {
    textAlign: "center" as const,
    padding: "2.5rem 1rem",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "0.625rem",
  },
  emptyIcon: {
    fontSize: "2.5rem",
    opacity: 0.4,
  },
  emptyText: {
    fontSize: "0.9375rem",
    color: "var(--color-forge-muted, #9090a8)",
  },
  errorBox: {
    background: "rgba(248, 113, 113, 0.08)",
    border: "1px solid rgba(248, 113, 113, 0.3)",
    borderRadius: "0.625rem",
    padding: "0.875rem 1rem",
    color: "#f87171",
    fontSize: "0.9rem",
  },
  separator: {
    height: "1px",
    background: "var(--color-forge-border, #2a2a42)",
    margin: "0 -1.5rem",
  },
} as const;

// ── Status label ──────────────────────────────────────────────────────────────

function statusLabel(status: OutputCardProps["status"]): string {
  switch (status) {
    case "running":  return "Running…";
    case "complete": return "Complete";
    case "error":    return "Error";
    default:         return "Ready";
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OutputCard({
  outputContract,
  values,
  publicMode = false,
  nodeLabel,
  status = "idle",
  errorMessage,
  onCopy,
  onDownload,
  trustSignals,
}: OutputCardProps): React.ReactElement {
  // Determine which fields to render
  const publicSet = new Set(outputContract.public_fields ?? []);

  const visibleFields = outputContract.fields.filter((field) => {
    if (publicMode && publicSet.size > 0 && !publicSet.has(field.key)) {
      return false;
    }
    return true;
  });

  const isEmpty =
    status === "idle" ||
    Object.keys(values).length === 0 ||
    visibleFields.every((f) => {
      const v = values[f.key];
      return v === undefined || v === null || v === "";
    });

  const hasHeader = nodeLabel !== undefined || status !== "idle";

  return (
    <section
      aria-label={nodeLabel ?? "Output"}
      style={S.card}
      data-testid="output-card"
    >
      {hasHeader && (
        <>
          <div style={S.header}>
            <div style={S.headerLeft}>
              {nodeLabel && (
                <h2 style={S.nodeLabel}>{nodeLabel}</h2>
              )}
              <div
                style={S.statusBadge(status)}
                aria-live="polite"
                aria-label={`Status: ${statusLabel(status)}`}
              >
                <span style={S.statusDot} />
                {statusLabel(status)}
              </div>
            </div>

            {status === "complete" && (onCopy || onDownload) && (
              <div style={S.actionsRow}>
              <OutputActions 
                data={values} 
                publicMode={publicMode} 
                sectionName={nodeLabel || "Output"} 
                isSuite={false} 
              />
              </div>
            )}
          </div>
          <div style={S.separator} aria-hidden />
        </>
      )}

      {status === "error" && errorMessage && (
        <div style={S.errorBox} role="alert">
          <strong>Error:</strong> {errorMessage}
        </div>
      )}

      {status === "running" && isEmpty && (
        <div style={S.emptyState}>
          <span style={S.emptyIcon} aria-hidden>⏳</span>
          <p style={S.emptyText}>Generating your result…</p>
        </div>
      )}

      {status !== "running" && isEmpty && status !== "error" && (
        <div style={S.emptyState}>
          <span style={S.emptyIcon} aria-hidden>✦</span>
          <p style={S.emptyText}>Result will appear here after you run.</p>
        </div>
      )}

      {!isEmpty && (
        <>
          {trustSignals && (
            <TrustSignalPanel signals={trustSignals} publicMode={publicMode} />
          )}
          <div style={S.fields}>
          {visibleFields.map((field) => (
            <OutputFieldRenderer
              key={field.key}
              field={field}
              value={values[field.key]}
            />
          ))}
          </div>
        </>
      )}
    </section>
  );
}
