import type { OutputContract } from "@cognitive-forge/core";
import { FORBIDDEN_PUBLIC_KEYS } from "./constants";

// ── Pre-compute forbidden set for O(1) lookup ────────────────────────────────

const FORBIDDEN_SET = new Set<string>(FORBIDDEN_PUBLIC_KEYS);

// ── Sanitizer ─────────────────────────────────────────────────────────────────

/**
 * Sanitizes AI-produced output for public API consumption.
 *
 * @param output   - Raw output from the AI run (may contain extra keys).
 * @param contract - OutputContract from the resolved CasePack MAO.
 * @returns        A new object containing only safe, publicly-visible keys.
 */
export function sanitizePublicResponse(
  output: Record<string, unknown>,
  contract: OutputContract
): Record<string, unknown> {
  // Determine which keys are allowed
  const publicFields = contract.public_fields;
  const hasPublicFields = publicFields !== undefined && publicFields.length > 0;

  const allowedKeys: Set<string> = hasPublicFields
    ? new Set(publicFields)
    : new Set(contract.fields.map((f) => f.key));

  // Build sanitized output
  const result: Record<string, unknown> = {};

  for (const key of allowedKeys) {
    // Defence-in-depth: reject forbidden keys even if listed in public_fields
    if (FORBIDDEN_SET.has(key)) {
      continue;
    }

    if (key in output) {
      result[key] = output[key];
    }
  }

  return result;
}

/**
 * Recursively scans an object or array and removes any key that matches a forbidden key.
 *
 * @param obj - The object or array to sanitize.
 * @returns A new object or array with forbidden keys removed recursively.
 */
export function deepSanitize<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepSanitize(item)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (FORBIDDEN_SET.has(key)) {
      continue;
    }
    result[key] = deepSanitize(value);
  }

  return result as T;
}
