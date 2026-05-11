/**
 * handoff-validator.ts — Validates a mapped output against a HandoffContract.
 *
 * After mapping_rules have been executed, the resulting target_input is
 * validated against the handoff_contract.fields to ensure all expected
 * fields are present and non-empty before being passed to the target CasePack.
 *
 * SECURITY: This is an internal validation step. HandoffValidationResult
 * is included in the BridgeRunResult but never exposed in public API responses.
 *
 * MVP rules:
 * - A field listed in handoff_contract.fields is "required" if it has no
 *   explicit optional marker — all fields are treated as required for MVP.
 * - Type compatibility is checked at the string level only (text → string).
 * - Numeric and boolean types pass if the value is defined.
 */

import type { HandoffContract } from "@cognitive-forge/core";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HandoffValidationError {
  readonly field:   string;
  readonly message: string;
}

export interface HandoffValidationResult {
  readonly valid:  boolean;
  readonly errors: HandoffValidationError[];
}

// ── Validator ─────────────────────────────────────────────────────────────────

/**
 * Validates mapped data against a handoff contract.
 *
 * @param mappedData      - The bridge-mapped target input.
 * @param handoffContract - The formal handoff_contract from the BridgeCasePack.
 * @returns               Validation result with errors array.
 */
export function validateHandoff(
  mappedData:      Record<string, unknown>,
  handoffContract: HandoffContract
): HandoffValidationResult {
  const errors: HandoffValidationError[] = [];

  for (const fieldDef of handoffContract.fields) {
    const value = mappedData[fieldDef.key];

    // ── Presence check ───────────────────────────────────────────────────
    if (value === undefined || value === null) {
      errors.push({
        field:   fieldDef.key,
        message: `Required handoff field "${fieldDef.key}" is missing from the mapped output`,
      });
      continue;
    }

    // ── Empty string check for text fields ───────────────────────────────
    if (fieldDef.type === "text" && typeof value === "string" && value.trim() === "") {
      errors.push({
        field:   fieldDef.key,
        message: `Handoff field "${fieldDef.key}" is empty after mapping`,
      });
      continue;
    }

    // ── Type compatibility check ─────────────────────────────────────────
    if (fieldDef.type === "text" && typeof value !== "string") {
      // Accept coercible types (number, boolean) by coercing to string — non-blocking
      // Only fail if the type is completely incompatible (e.g. an object/array for a text field)
      if (typeof value === "object" && !Array.isArray(value)) {
        errors.push({
          field:   fieldDef.key,
          message: `Handoff field "${fieldDef.key}" expected text but received object`,
        });
        continue;
      }
      // Numbers and booleans are coercible — pass through without error
    }

    if (fieldDef.type === "number" && typeof value !== "number") {
      const coerced = Number(value);
      if (isNaN(coerced)) {
        errors.push({
          field:   fieldDef.key,
          message: `Handoff field "${fieldDef.key}" expected number but received non-numeric value`,
        });
        continue;
      }
    }
  }

  return {
    valid:  errors.length === 0,
    errors,
  };
}
