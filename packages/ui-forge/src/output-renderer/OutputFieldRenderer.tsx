/**
 * OutputFieldRenderer — renders a single output field value safely.
 *
 * Handles string values (most common), plus arrays and objects safely
 * without raw JSON.stringify leaking internals. Used by OutputCard.
 *
 * ISOLATION: must NOT import @cognitive-forge/runtime.
 */

import React, { useState } from "react";
import type { FieldDef } from "@cognitive-forge/core";

// ── Types ─────────────────────────────────────────────────────────────────────

export type OutputValue = string | number | boolean | string[] | Record<string, unknown> | null | undefined;

export interface OutputFieldRendererProps {
  field: FieldDef;
  value: OutputValue;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  wrapper: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.5rem",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between" as const,
    gap: "0.5rem",
  },
  label: {
    fontSize: "0.8125rem",
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
    color: "var(--color-forge-muted, #9090a8)",
  },
  copyBtn: {
    background: "none",
    border: "1px solid var(--color-forge-border, #2a2a42)",
    borderRadius: "0.375rem",
    color: "var(--color-forge-muted, #9090a8)",
    fontSize: "0.75rem",
    padding: "0.1875rem 0.5rem",
    cursor: "pointer",
    transition: "border-color 0.15s, color 0.15s",
    lineHeight: 1.4,
  },
  pre: {
    background: "var(--color-forge-800, #13131f)",
    border: "1px solid var(--color-forge-border, #2a2a42)",
    borderRadius: "0.625rem",
    color: "var(--color-forge-text, #e8e8f0)",
    fontSize: "0.9rem",
    lineHeight: 1.65,
    padding: "0.875rem 1rem",
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-word" as const,
    margin: 0,
    fontFamily: "inherit",
  },
  inlineValue: {
    background: "var(--color-forge-800, #13131f)",
    border: "1px solid var(--color-forge-border, #2a2a42)",
    borderRadius: "0.625rem",
    color: "var(--color-forge-text, #e8e8f0)",
    fontSize: "0.9375rem",
    padding: "0.5rem 0.875rem",
  },
  arrayWrapper: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.375rem",
  },
  arrayItem: {
    background: "var(--color-forge-800, #13131f)",
    border: "1px solid var(--color-forge-border, #2a2a42)",
    borderRadius: "0.5rem",
    color: "var(--color-forge-text, #e8e8f0)",
    fontSize: "0.9rem",
    padding: "0.4375rem 0.75rem",
    display: "flex",
    alignItems: "flex-start",
    gap: "0.5rem",
  },
  arrayBullet: {
    color: "var(--color-forge-accent, #6c63ff)",
    fontWeight: 700,
    flexShrink: 0,
  },
  emptyState: {
    fontSize: "0.875rem",
    color: "var(--color-forge-muted, #9090a8)",
    fontStyle: "italic",
  },
} as const;

// ── Copy-to-clipboard button ──────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available — silent fail
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      style={S.copyBtn}
      aria-label={`Copy ${copied ? "copied" : "to clipboard"}`}
      data-testid="copy-btn"
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

// ── Value rendering strategies ────────────────────────────────────────────────

function renderStringValue(
  field: FieldDef,
  value: string
) {
  const isMultiline = value.includes("\n") || field.type === "text" || value.length > 120;

  if (isMultiline) {
    return <pre style={S.pre}>{value}</pre>;
  }

  return <div style={S.inlineValue}>{value}</div>;
}

function renderArrayValue(items: string[]) {
  if (items.length === 0) {
    return <p style={S.emptyState}>No items</p>;
  }

  return (
    <div style={S.arrayWrapper}>
      {items.map((item, idx) => (
        <div key={idx} style={S.arrayItem}>
          <span style={S.arrayBullet}>·</span>
          <span>{String(item)}</span>
        </div>
      ))}
    </div>
  );
}

function renderObjectValue(obj: Record<string, unknown>) {
  // Safe flat display: key: value pairs, no internals
  const entries = Object.entries(obj);
  if (entries.length === 0) return <p style={S.emptyState}>Empty</p>;

  return (
    <div style={S.arrayWrapper}>
      {entries.map(([k, v]) => (
        <div key={k} style={S.arrayItem}>
          <span style={{ ...S.arrayBullet, minWidth: "5rem" }}>{k}:</span>
          <span style={{ wordBreak: "break-word" }}>{String(v ?? "")}</span>
        </div>
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OutputFieldRenderer({
  field,
  value,
}: OutputFieldRendererProps) {
  const isEmpty =
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);

  const textForCopy = isEmpty
    ? ""
    : Array.isArray(value)
    ? (value as string[]).join("\n")
    : typeof value === "object" && value !== null
    ? Object.entries(value)
        .map(([k, v]) => `${k}: ${String(v ?? "")}`)
        .join("\n")
    : String(value);

  let body: React.ReactElement;

  if (isEmpty) {
    body = <p style={S.emptyState}>—</p>;
  } else if (Array.isArray(value)) {
    body = renderArrayValue(value as string[]);
  } else if (typeof value === "object" && value !== null) {
    body = renderObjectValue(value as Record<string, unknown>);
  } else {
    body = renderStringValue(field, String(value));
  }

  return (
    <div style={S.wrapper} data-testid={`output-field-${field.key}`}>
      <div style={S.header}>
        <span style={S.label}>{field.label}</span>
        {!isEmpty && textForCopy && <CopyButton text={textForCopy} />}
      </div>
      {body}
    </div>
  );
}
