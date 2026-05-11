/**
 * SuiteInputForm — Displays pre-filled demo input fields.
 * Fields are editable but do nothing on submit in static mode.
 * The "Run Demo" action is handled by DemoAppLauncher.
 */

import React from "react";
import type { DemoInputField } from "../../app/demo/_lib/demo-registry";

interface SuiteInputFormProps {
  fields:      DemoInputField[];
  values:      Record<string, string>;
  onChange:    (key: string, value: string) => void;
  disabled?:   boolean;
}

const S = {
  wrapper: {
    display:       "flex",
    flexDirection: "column" as const,
    gap:           "1rem",
  },
  sectionTitle: {
    fontSize:     "0.75rem",
    fontWeight:   600,
    letterSpacing:"0.07em",
    textTransform:"uppercase" as const,
    color:        "#9090a8",
    marginBottom: "0.25rem",
  },
  field: {
    display:       "flex",
    flexDirection: "column" as const,
    gap:           "0.375rem",
  },
  label: {
    fontSize:   "0.875rem",
    fontWeight: 600,
    color:      "#e8e8f0",
    display:    "flex",
    alignItems: "center",
    gap:        "0.375rem",
  },
  required: {
    color:     "#f87171",
    fontSize:  "0.75rem",
    fontWeight:700,
  },
  optional: {
    color:     "#9090a8",
    fontSize:  "0.75rem",
    fontWeight:400,
  },
  input: (disabled: boolean) => ({
    width:        "100%",
    padding:      "0.625rem 0.875rem",
    background:   disabled ? "#0a0a0f" : "#13131f",
    border:       "1px solid #2a2a42",
    borderRadius: "0.5rem",
    fontSize:     "0.9rem",
    color:        "#e8e8f0",
    outline:      "none",
    fontFamily:   "inherit",
    resize:       "vertical" as const,
    boxSizing:    "border-box" as const,
    opacity:      disabled ? 0.7 : 1,
  }),
  select: (disabled: boolean) => ({
    width:        "100%",
    padding:      "0.625rem 0.875rem",
    background:   disabled ? "#0a0a0f" : "#13131f",
    border:       "1px solid #2a2a42",
    borderRadius: "0.5rem",
    fontSize:     "0.9rem",
    color:        "#e8e8f0",
    outline:      "none",
    fontFamily:   "inherit",
    cursor:       disabled ? "not-allowed" : "pointer",
    opacity:      disabled ? 0.7 : 1,
  }),
} as const;

export function SuiteInputForm({
  fields,
  values,
  onChange,
  disabled = false,
}: SuiteInputFormProps) {
  return (
    <div style={S.wrapper} data-testid="suite-input-form">
      <div style={S.sectionTitle}>Input</div>
      {fields.map((field) => (
        <div key={field.key} style={S.field}>
          <label htmlFor={`demo-field-${field.key}`} style={S.label}>
            {field.label}
            {field.required
              ? <span style={S.required}> *</span>
              : <span style={S.optional}> (optional)</span>
            }
          </label>
          {field.type === "select" && field.options ? (
            <select
              id={`demo-field-${field.key}`}
              style={S.select(disabled)}
              value={values[field.key] ?? field.default_value ?? ""}
              onChange={(e) => onChange(field.key, e.target.value)}
              disabled={disabled}
            >
              {field.options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : field.type === "text" ? (
            <textarea
              id={`demo-field-${field.key}`}
              style={{ ...S.input(disabled), minHeight: "5rem" }}
              value={values[field.key] ?? ""}
              placeholder={field.placeholder}
              onChange={(e) => onChange(field.key, e.target.value)}
              disabled={disabled}
              rows={3}
            />
          ) : (
            <input
              id={`demo-field-${field.key}`}
              type="text"
              style={S.input(disabled)}
              value={values[field.key] ?? ""}
              placeholder={field.placeholder}
              onChange={(e) => onChange(field.key, e.target.value)}
              disabled={disabled}
            />
          )}
        </div>
      ))}
    </div>
  );
}
