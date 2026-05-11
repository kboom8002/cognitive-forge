/**
 * DynamicForm — contract-driven input form.
 *
 * Renders an InputContract as a form. Fully controlled: the caller
 * manages formState and receives onFieldChange / onSubmit callbacks.
 *
 * Key behaviours:
 * - Iterates input_contract.fields[] in declared order.
 * - Respects UISchema.field_overrides (label, placeholder, hidden, order).
 * - Validates required_fields client-side before calling onSubmit.
 * - Supports UISchema.input_sections grouping if present.
 * - Disabled + loading state while submitting=true.
 * - Trust badge displayed when uiSchema.trust_badge=true.
 *
 * ISOLATION: must NOT import @cognitive-forge/runtime or any server module.
 */

import React, { useState, useCallback } from "react";
import type { InputContract, UISchema } from "@cognitive-forge/core";
import { FieldRenderer } from "./FieldRenderer";

// ── Types ─────────────────────────────────────────────────────────────────────

/** The value type for a single form field. */
export type FieldValue = string | string[] | boolean;

/** All form values keyed by field.key. */
export type FormValues = Record<string, FieldValue>;

export interface DynamicFormProps {
  /** Input contract from the resolved CasePack. */
  inputContract: InputContract;
  /** UI rendering configuration. */
  uiSchema?: UISchema | undefined;
  /** Controlled form state — managed by the parent. */
  formState: FormValues;
  /** Called whenever a single field value changes. */
  onFieldChange: (key: string, value: FieldValue) => void;
  /** Called after client-side validation passes. */
  onSubmit: (values: FormValues) => void;
  /** True while the run is in-flight. */
  submitting?: boolean | undefined;
  /** External field-level errors (e.g. from API validation). */
  errors?: Record<string, string> | undefined;
  /** Disable the entire form. */
  disabled?: boolean | undefined;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "1.25rem",
  },
  fieldsWrapper: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "1.25rem",
  },
  footer: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.75rem",
  },
  submitBtn: (disabled: boolean) => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    padding: "0.625rem 1.5rem",
    borderRadius: "0.5rem",
    border: "none",
    background: disabled
      ? "var(--color-forge-600, #2a2a42)"
      : "var(--color-forge-accent, #6c63ff)",
    color: disabled ? "var(--color-forge-muted, #9090a8)" : "#fff",
    fontWeight: 600,
    fontSize: "0.9375rem",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "background 0.15s, opacity 0.15s",
    minWidth: "8rem",
  }),
  spinner: {
    width: "1rem",
    height: "1rem",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "forge-spin 0.7s linear infinite",
  },
  trustBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
    padding: "0.25rem 0.625rem",
    borderRadius: "9999px",
    border: "1px solid var(--color-forge-border, #2a2a42)",
    fontSize: "0.75rem",
    color: "var(--color-forge-muted, #9090a8)",
    width: "fit-content",
  },
  trustDot: {
    width: "0.4rem",
    height: "0.4rem",
    borderRadius: "50%",
    background: "var(--color-forge-accent, #6c63ff)",
  },
} as const;

// ── Internal helpers ──────────────────────────────────────────────────────────

function getFieldsInOrder(inputContract: InputContract, uiSchema?: UISchema) {
  const overrides = uiSchema?.field_overrides ?? {};

  return [...inputContract.fields].sort((a, b) => {
    const orderA = overrides[a.key]?.order ?? Infinity;
    const orderB = overrides[b.key]?.order ?? Infinity;
    if (orderA !== orderB) return orderA - orderB;
    return 0; // preserve original order when both are Infinity
  });
}

function validateRequired(
  inputContract: InputContract,
  formState: FormValues
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const key of inputContract.required_fields) {
    const val = formState[key];
    const isEmpty =
      val === undefined ||
      val === null ||
      val === "" ||
      (Array.isArray(val) && val.length === 0);
    if (isEmpty) {
      const field = inputContract.fields.find((f) => f.key === key);
      errors[key] = `${field?.label ?? key} is required`;
    }
  }
  return errors;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DynamicForm({
  inputContract,
  uiSchema,
  formState,
  onFieldChange,
  onSubmit,
  submitting = false,
  errors: externalErrors,
  disabled = false,
}: DynamicFormProps) {
  // Client-side validation errors (cleared on each submit attempt)
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const isDisabled = disabled || submitting;
  const allErrors = { ...localErrors, ...externalErrors };

  const submitLabel =
    uiSchema?.submit_label ??
    (uiSchema?.app_mode === "composite_app" ? "Start" : "Run");

  const orderedFields = getFieldsInOrder(inputContract, uiSchema);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const validationErrors = validateRequired(inputContract, formState);
      if (Object.keys(validationErrors).length > 0) {
        setLocalErrors(validationErrors);
        return;
      }
      setLocalErrors({});
      onSubmit(formState);
    },
    [inputContract, formState, onSubmit]
  );

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Input form"
      style={S.form}
      data-testid="dynamic-form"
    >
      <div style={S.fieldsWrapper}>
        {orderedFields.map((field) => {
            const ov  = uiSchema?.field_overrides?.[field.key];
            const err = allErrors[field.key];
            return (
              <FieldRenderer
                key={field.key}
                field={field}
                value={formState[field.key]}
                onChange={onFieldChange}
                disabled={isDisabled}
                idPrefix="dynform"
                {...(ov  !== undefined ? { override: ov }  : {})}
                {...(err !== undefined ? { error: err }    : {})}
              />
            );
          })}
      </div>

      <div style={S.footer}>
        <button
          type="submit"
          disabled={isDisabled}
          style={S.submitBtn(isDisabled)}
          aria-busy={submitting}
          data-testid="submit-btn"
        >
          {submitting && (
            <span
              style={S.spinner}
              role="status"
              aria-label="Loading"
            />
          )}
          {submitting ? "Running…" : submitLabel}
        </button>

        {(uiSchema?.trust_badge ?? true) && (
          <div style={S.trustBadge} aria-label="AI-generated content">
            <span style={S.trustDot} />
            AI-generated · Cognitive Forge
          </div>
        )}
      </div>

      {/* Keyframe animation injected once */}
      <style>{`@keyframes forge-spin { to { transform: rotate(360deg); } }`}</style>
    </form>
  );
}

// ── Re-export validation utility ──────────────────────────────────────────────

/** Exported for testing and server-side pre-validation. */
export { validateRequired, getFieldsInOrder };
