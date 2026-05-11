/**
 * SuiteOutputPreview — Static preview of demo output fields.
 * Renders fixture output using the defined outputFields labels.
 * Never exposes raw JSON internals.
 */

import React from "react";
import type { DemoOutputField } from "../../app/demo/_lib/demo-registry";

interface SuiteOutputPreviewProps {
  outputFields:  DemoOutputField[];
  sampleOutput:  Record<string, string>;
  isVisible:     boolean;
  accentColor:   string;
}

const S = {
  wrapper: {
    padding:      "1.25rem",
    background:   "#1e1e30",
    border:       "1px solid #2a2a42",
    borderRadius: "0.875rem",
    display:      "flex",
    flexDirection:"column" as const,
    gap:          "0",
  },
  header: {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "space-between" as const,
    marginBottom:   "1rem",
  },
  sectionTitle: {
    fontSize:     "0.75rem",
    fontWeight:   600,
    letterSpacing:"0.07em",
    textTransform:"uppercase" as const,
    color:        "#9090a8",
  },
  statusBadge: (isVisible: boolean) => ({
    display:    "inline-flex",
    alignItems: "center",
    gap:        "0.375rem",
    padding:    "0.1875rem 0.625rem",
    borderRadius:"9999px",
    fontSize:   "0.75rem",
    fontWeight: 600,
    background: isVisible ? "rgba(52, 211, 153, 0.12)" : "rgba(144, 144, 168, 0.1)",
    color:      isVisible ? "#34d399" : "#9090a8",
    border:     isVisible ? "1px solid rgba(52, 211, 153, 0.3)" : "1px solid #2a2a42",
  }),
  emptyState: {
    textAlign:     "center" as const,
    padding:       "3rem 1rem",
    display:       "flex",
    flexDirection: "column" as const,
    alignItems:    "center",
    gap:           "0.75rem",
  },
  emptyIcon: {
    fontSize: "2.5rem",
    opacity:  0.35,
  },
  emptyText: {
    fontSize: "0.9375rem",
    color:    "#9090a8",
  },
  fields: {
    display:       "flex",
    flexDirection: "column" as const,
    gap:           "1.25rem",
  },
  field: {
    display:       "flex",
    flexDirection: "column" as const,
    gap:           "0.375rem",
  },
  fieldLabel: {
    fontSize:     "0.75rem",
    fontWeight:   700,
    letterSpacing:"0.05em",
    textTransform:"uppercase" as const,
    color:        "#9090a8",
  },
  fieldValue: {
    fontSize:     "0.9rem",
    lineHeight:   1.7,
    color:        "#e8e8f0",
    whiteSpace:   "pre-wrap" as const,
    display:      "-webkit-box" as const,
    WebkitLineClamp: 8,
    WebkitBoxOrient: "vertical" as const,
    overflow:     "hidden",
  },
  separator: {
    height:     "1px",
    background: "#2a2a42",
    margin:     "0",
  },
} as const;

export function SuiteOutputPreview({
  outputFields,
  sampleOutput,
  isVisible,
  accentColor: _accentColor,
}: SuiteOutputPreviewProps) {
  return (
    <div style={S.wrapper} data-testid="suite-output-preview">
      <div style={S.header}>
        <span style={S.sectionTitle}>Final Output Preview</span>
        <span style={S.statusBadge(isVisible)}>
          <span style={{ width: "0.4rem", height: "0.4rem", borderRadius: "50%", background: "currentColor", display: "inline-block" }} aria-hidden />
          {isVisible ? "Complete" : "Ready"}
        </span>
      </div>
      {!isVisible ? (
        <div style={S.emptyState}>
          <span style={S.emptyIcon} aria-hidden>✦</span>
          <p style={S.emptyText}>Run the demo to see the full output here.</p>
        </div>
      ) : (
        <div style={S.fields}>
          {outputFields.map((field, i) => {
            const value = sampleOutput[field.key];
            if (!value) return null;
            return (
              <React.Fragment key={field.key}>
                {i > 0 && <div style={S.separator} aria-hidden />}
                <div style={S.field}>
                  <span style={S.fieldLabel}>{field.label}</span>
                  <p style={S.fieldValue}>{value}</p>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
