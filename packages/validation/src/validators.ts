import type { InputContract, OutputContract, ValidationReport, ValidationError } from "@cognitive-forge/core";

// ── Helpers ───────────────────────────────────────────────────────────────────

function isNonEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function isoNow(): string {
  return new Date().toISOString();
}

// ── Input Validator ───────────────────────────────────────────────────────────

/**
 * Validates user-submitted input against the InputContract.
 *
 * @param input    - Key-value map of user-provided field values.
 * @param contract - InputContract from the resolved CasePack MAO.
 * @returns        ValidationReport (pass | fail | warning). Never throws.
 */
export function validateInput(
  input: Record<string, unknown>,
  contract: InputContract
): ValidationReport {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  const fieldMap = new Map(contract.fields.map((f) => [f.key, f]));
  const requiredSet = new Set(contract.required_fields);

  // ── Rule 1: All required_fields must be present and non-empty ─────────────
  for (const requiredKey of contract.required_fields) {
    const value = input[requiredKey];
    if (!isNonEmpty(value)) {
      errors.push({
        code:     "MISSING_REQUIRED_FIELD",
        message:  `Required field "${requiredKey}" is missing or empty`,
        path:     [requiredKey],
        blocking: true,
      });
    }
  }

  // ── Rule 2: Type validation for each submitted field ──────────────────────
  for (const [key, value] of Object.entries(input)) {
    const fieldDef = fieldMap.get(key);

    // Unknown field — not a blocking error, just a warning
    if (!fieldDef) {
      warnings.push(`Unknown field "${key}" is not in input_contract.fields[] — it will be ignored`);
      continue;
    }

    // Skip empty optional fields — nothing to type-check
    if (!isNonEmpty(value) && !requiredSet.has(key)) {
      continue;
    }

    // Type checks
    switch (fieldDef.type) {
      case "string":
      case "text":
      case "email":
      case "url":
        if (typeof value !== "string") {
          errors.push({
            code:     "FIELD_TYPE_MISMATCH",
            message:  `Field "${key}" expects a string but received ${typeof value}`,
            path:     [key],
            blocking: true,
          });
        }
        break;

      case "number": {
        const isNum = typeof value === "number" ||
          (typeof value === "string" && value.trim() !== "" && !isNaN(Number(value)));
        if (!isNum) {
          errors.push({
            code:     "FIELD_TYPE_MISMATCH",
            message:  `Field "${key}" expects a number but received "${String(value)}"`,
            path:     [key],
            blocking: true,
          });
        }
        break;
      }

      case "boolean":
        if (typeof value !== "boolean") {
          errors.push({
            code:     "FIELD_TYPE_MISMATCH",
            message:  `Field "${key}" expects a boolean but received ${typeof value}`,
            path:     [key],
            blocking: true,
          });
        }
        break;

      case "select": {
        const opts = fieldDef.options ?? [];
        if (typeof value !== "string" || !opts.includes(value)) {
          errors.push({
            code:     "FIELD_VALUE_NOT_IN_OPTIONS",
            message:  `Field "${key}" value "${String(value)}" is not in allowed options: [${opts.join(", ")}]`,
            path:     [key],
            blocking: true,
          });
        }
        break;
      }

      case "multiselect": {
        const opts = fieldDef.options ?? [];
        const values = Array.isArray(value) ? value : [value];
        for (const v of values) {
          if (typeof v !== "string" || !opts.includes(v)) {
            errors.push({
              code:     "FIELD_VALUE_NOT_IN_OPTIONS",
              message:  `Field "${key}" multiselect value "${String(v)}" is not in allowed options: [${opts.join(", ")}]`,
              path:     [key],
              blocking: true,
            });
          }
        }
        break;
      }

      case "date":
        // Accept any string; real date parsing deferred to Sprint 08
        if (typeof value !== "string") {
          errors.push({
            code:     "FIELD_TYPE_MISMATCH",
            message:  `Field "${key}" expects a date string but received ${typeof value}`,
            path:     [key],
            blocking: false,
          });
        }
        break;

      case "file":
        // File references are strings (e.g. storage keys)
        if (typeof value !== "string") {
          errors.push({
            code:     "FIELD_TYPE_MISMATCH",
            message:  `Field "${key}" expects a file reference string but received ${typeof value}`,
            path:     [key],
            blocking: false,
          });
        }
        break;
    }
  }

  // ── Build ValidationReport ────────────────────────────────────────────────
  const hasBlocking = errors.some((e) => e.blocking !== false);
  const hasErrors   = errors.length > 0;

  const valid  = !hasBlocking;
  const status: ValidationReport["status"] =
    hasBlocking ? "fail" :
    hasErrors   ? "warning" :
    "pass";

  return {
    valid,
    status,
    errors,
    ...(warnings.length > 0 ? { warnings } : {}),
    checked_at: isoNow(),
  };
}

// ── Output Validator ──────────────────────────────────────────────────────────

/**
 * Validates AI-generated output against the OutputContract.
 *
 * @param output   - Key-value map of AI-produced field values.
 * @param contract - OutputContract from the resolved CasePack MAO.
 * @returns        ValidationReport (pass | fail | warning). Never throws.
 */
export function validateOutput(
  output: Record<string, unknown>,
  contract: OutputContract
): ValidationReport {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  const fieldMap = new Map(contract.fields.map((f) => [f.key, f]));
  const requiredSet = new Set(contract.required_fields);

  // ── Rule 1: All required_fields must be present and non-empty ─────────────
  for (const requiredKey of contract.required_fields) {
    const value = output[requiredKey];
    if (!isNonEmpty(value)) {
      errors.push({
        code:     "MISSING_REQUIRED_OUTPUT_FIELD",
        message:  `Required output field "${requiredKey}" is missing or empty`,
        path:     [requiredKey],
        blocking: true,
      });
    }
  }

  // ── Rule 2: Type validation for each produced field ───────────────────────
  for (const [key, value] of Object.entries(output)) {
    const fieldDef = fieldMap.get(key);

    // Extra field not in contract — non-blocking warning
    if (!fieldDef) {
      warnings.push(
        `Output field "${key}" is not declared in output_contract.fields[] — ` +
        `it will be stripped by the sanitizer`
      );
      continue;
    }

    // Skip empty optional fields
    if (!isNonEmpty(value) && !requiredSet.has(key)) {
      continue;
    }

    // Type checks (output is AI-generated, so we allow reasonable coercions)
    switch (fieldDef.type) {
      case "string":
      case "text":
      case "email":
      case "url":
        if (typeof value !== "string") {
          errors.push({
            code:     "OUTPUT_TYPE_MISMATCH",
            message:  `Output field "${key}" expects a string but received ${typeof value}`,
            path:     [key],
            blocking: true,
          });
        }
        break;

      case "number": {
        const isNum = typeof value === "number" ||
          (typeof value === "string" && value.trim() !== "" && !isNaN(Number(value)));
        if (!isNum) {
          errors.push({
            code:     "OUTPUT_TYPE_MISMATCH",
            message:  `Output field "${key}" expects a number but received "${String(value)}"`,
            path:     [key],
            blocking: false, // Non-blocking — AI may return numerics as strings
          });
        }
        break;
      }

      case "boolean":
        if (typeof value !== "boolean" && value !== "true" && value !== "false") {
          errors.push({
            code:     "OUTPUT_TYPE_MISMATCH",
            message:  `Output field "${key}" expects a boolean but received ${typeof value}`,
            path:     [key],
            blocking: false,
          });
        }
        break;

      case "select":
      case "multiselect":
      case "date":
      case "file":
        // Accept any non-empty value from AI for these types
        // Strict validation deferred — AI output normalisation is complex
        break;
    }
  }

  // ── Build ValidationReport ────────────────────────────────────────────────
  const hasBlocking = errors.some((e) => e.blocking !== false);
  const hasErrors   = errors.length > 0;

  const valid  = !hasBlocking;
  const status: ValidationReport["status"] =
    hasBlocking ? "fail" :
    hasErrors   ? "warning" :
    "pass";

  return {
    valid,
    status,
    errors,
    ...(warnings.length > 0 ? { warnings } : {}),
    checked_at: isoNow(),
  };
}
