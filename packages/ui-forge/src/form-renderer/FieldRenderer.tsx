/**
 * FieldRenderer — renders a single FieldDef as the appropriate HTML widget.
 *
 * Stateless and fully controlled: all state lives in DynamicForm above.
 * Widget dispatch is based purely on FieldDef.type from @cognitive-forge/core.
 *
 * ISOLATION: must NOT import @cognitive-forge/runtime or any server module.
 */

import React from "react";
import type { FieldDef } from "@cognitive-forge/core";
import type { FieldOverride } from "@cognitive-forge/core";

// ── Props ────────────────────────────────────────────────────────────────────

export interface FieldRendererProps {
  /** Field definition from InputContract.fields[]. */
  field: FieldDef;
  /** Current controlled value (always a string except multiselect). */
  value: string | string[] | boolean | undefined;
  /** Called when the user changes the field value. */
  onChange: (key: string, value: string | string[] | boolean) => void;
  /** Optional override from UISchema.field_overrides. */
  override?: FieldOverride | undefined;
  /** Disable all interaction (e.g. while submitting). */
  disabled?: boolean | undefined;
  /** Field-level validation error message. */
  error?: string | undefined;
  /** Unique id prefix for label/input pairing. */
  idPrefix?: string | undefined;
}

// ── Styles (inline — no external CSS dependency) ─────────────────────────────

const S = {
  wrapper: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.375rem",
  },
  label: {
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "var(--color-forge-text, #e8e8f0)",
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
  },
  required: {
    color: "#f87171",
    fontSize: "0.75rem",
  },
  description: {
    fontSize: "0.8125rem",
    color: "var(--color-forge-muted, #9090a8)",
    lineHeight: 1.4,
  },
  input: (error: boolean) => ({
    width: "100%",
    background: "var(--color-forge-800, #13131f)",
    border: `1px solid ${error ? "#f87171" : "var(--color-forge-border, #2a2a42)"}`,
    borderRadius: "0.5rem",
    color: "var(--color-forge-text, #e8e8f0)",
    padding: "0.5rem 0.75rem",
    fontSize: "0.9375rem",
    outline: "none",
    transition: "border-color 0.15s",
    boxSizing: "border-box" as const,
  }),
  textarea: (error: boolean) => ({
    width: "100%",
    background: "var(--color-forge-800, #13131f)",
    border: `1px solid ${error ? "#f87171" : "var(--color-forge-border, #2a2a42)"}`,
    borderRadius: "0.5rem",
    color: "var(--color-forge-text, #e8e8f0)",
    padding: "0.5rem 0.75rem",
    fontSize: "0.9375rem",
    outline: "none",
    transition: "border-color 0.15s",
    resize: "vertical" as const,
    minHeight: "7rem",
    fontFamily: "inherit",
    boxSizing: "border-box" as const,
  }),
  select: (error: boolean) => ({
    width: "100%",
    background: "var(--color-forge-800, #13131f)",
    border: `1px solid ${error ? "#f87171" : "var(--color-forge-border, #2a2a42)"}`,
    borderRadius: "0.5rem",
    color: "var(--color-forge-text, #e8e8f0)",
    padding: "0.5rem 0.75rem",
    fontSize: "0.9375rem",
    outline: "none",
    boxSizing: "border-box" as const,
  }),
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.625rem",
  },
  checkbox: {
    width: "1.125rem",
    height: "1.125rem",
    accentColor: "var(--color-forge-accent, #6c63ff)",
    cursor: "pointer",
  },
  checkboxLabel: {
    fontSize: "0.9375rem",
    color: "var(--color-forge-text, #e8e8f0)",
    cursor: "pointer",
  },
  errorText: {
    fontSize: "0.8125rem",
    color: "#f87171",
  },
  multiselectWrapper: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.375rem",
    padding: "0.5rem 0.75rem",
    background: "var(--color-forge-800, #13131f)",
    border: "1px solid var(--color-forge-border, #2a2a42)",
    borderRadius: "0.5rem",
  },
  multiselectItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.9375rem",
    color: "var(--color-forge-text, #e8e8f0)",
    cursor: "pointer",
  },
} as const;

// ── Component ─────────────────────────────────────────────────────────────────

export function FieldRenderer({
  field,
  value,
  onChange,
  override,
  disabled = false,
  error,
  idPrefix = "field",
}: FieldRendererProps): React.ReactElement | null {
  // Apply override.hidden
  if (override?.hidden) return null;

  const id       = `${idPrefix}-${field.key}`;
  const label    = override?.label       ?? field.label;
  const placeholder = override?.placeholder ?? field.placeholder ?? "";
  const hasError = Boolean(error);

  const handleStringChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    onChange(field.key, e.target.value);
  };

  const handleBooleanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(field.key, e.target.checked);
  };

  const handleMultiselectChange = (option: string) => {
    const current = Array.isArray(value) ? value : [];
    const next = current.includes(option)
      ? current.filter((v) => v !== option)
      : [...current, option];
    onChange(field.key, next);
  };

  // Widget dispatch
  let widget: React.ReactElement;

  switch (field.type) {
    case "text":
      widget = (
        <textarea
          id={id}
          name={field.key}
          value={typeof value === "string" ? value : ""}
          onChange={handleStringChange}
          placeholder={placeholder}
          disabled={disabled}
          aria-describedby={field.description ? `${id}-desc` : undefined}
          aria-invalid={hasError}
          style={S.textarea(hasError)}
          data-testid={`field-${field.key}`}
        />
      );
      break;

    case "boolean":
      widget = (
        <div style={S.checkboxRow}>
          <input
            id={id}
            type="checkbox"
            name={field.key}
            checked={value === true || value === "true"}
            onChange={handleBooleanChange}
            disabled={disabled}
            style={S.checkbox}
            data-testid={`field-${field.key}`}
          />
          <label htmlFor={id} style={S.checkboxLabel}>{label}</label>
        </div>
      );
      // Return early — label is embedded in the checkbox row
      return (
        <div style={S.wrapper} role="group">
          {widget}
          {field.description && <p id={`${id}-desc`} style={S.description}>{field.description}</p>}
          {error && <p style={S.errorText} role="alert">{error}</p>}
        </div>
      );

    case "select":
      widget = (
        <select
          id={id}
          name={field.key}
          value={typeof value === "string" ? value : ""}
          onChange={handleStringChange}
          disabled={disabled}
          aria-invalid={hasError}
          style={S.select(hasError)}
          data-testid={`field-${field.key}`}
        >
          <option value="">— select —</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
      break;

    case "multiselect":
      widget = (
        <div
          style={{
            ...S.multiselectWrapper,
            borderColor: hasError ? "#f87171" : "var(--color-forge-border, #2a2a42)",
          }}
          role="group"
          aria-labelledby={`${id}-label`}
          data-testid={`field-${field.key}`}
        >
          {(field.options ?? []).map((opt) => {
            const checked = Array.isArray(value) ? value.includes(opt) : false;
            return (
              <label key={opt} style={S.multiselectItem}>
                <input
                  type="checkbox"
                  value={opt}
                  checked={checked}
                  onChange={() => handleMultiselectChange(opt)}
                  disabled={disabled}
                  style={{ accentColor: "var(--color-forge-accent, #6c63ff)" }}
                />
                {opt}
              </label>
            );
          })}
        </div>
      );
      break;

    case "number":
      widget = (
        <input
          id={id}
          type="number"
          name={field.key}
          value={typeof value === "string" ? value : ""}
          onChange={handleStringChange}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={hasError}
          style={S.input(hasError)}
          data-testid={`field-${field.key}`}
        />
      );
      break;

    case "date":
      widget = (
        <input
          id={id}
          type="date"
          name={field.key}
          value={typeof value === "string" ? value : ""}
          onChange={handleStringChange}
          disabled={disabled}
          aria-invalid={hasError}
          style={S.input(hasError)}
          data-testid={`field-${field.key}`}
        />
      );
      break;

    case "email":
      widget = (
        <input
          id={id}
          type="email"
          name={field.key}
          value={typeof value === "string" ? value : ""}
          onChange={handleStringChange}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={hasError}
          style={S.input(hasError)}
          data-testid={`field-${field.key}`}
        />
      );
      break;

    case "url":
      widget = (
        <input
          id={id}
          type="url"
          name={field.key}
          value={typeof value === "string" ? value : ""}
          onChange={handleStringChange}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={hasError}
          style={S.input(hasError)}
          data-testid={`field-${field.key}`}
        />
      );
      break;

    case "file":
      widget = (
        <input
          id={id}
          type="file"
          name={field.key}
          disabled={disabled}
          aria-invalid={hasError}
          style={S.input(hasError)}
          data-testid={`field-${field.key}`}
          onChange={(e) => {
            const file = e.target.files?.[0];
            onChange(field.key, file?.name ?? "");
          }}
        />
      );
      break;

    default: // "string" + catch-all
      widget = (
        <input
          id={id}
          type="text"
          name={field.key}
          value={typeof value === "string" ? value : ""}
          onChange={handleStringChange}
          placeholder={placeholder}
          disabled={disabled}
          aria-describedby={field.description ? `${id}-desc` : undefined}
          aria-invalid={hasError}
          style={S.input(hasError)}
          data-testid={`field-${field.key}`}
        />
      );
  }

  return (
    <div style={S.wrapper}>
      <label id={`${id}-label`} htmlFor={id} style={S.label}>
        {label}
      </label>
      {field.description && (
        <p id={`${id}-desc`} style={S.description}>{field.description}</p>
      )}
      {widget}
      {error && <p style={S.errorText} role="alert">{error}</p>}
    </div>
  );
}
