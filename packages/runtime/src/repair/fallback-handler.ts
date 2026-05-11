/**
 * FallbackHandler — salvages partial output when repair loop fails.
 *
 * When all repair attempts have been exhausted, the FallbackHandler
 * examines the last output and:
 * 1. Preserves any valid required fields that are present.
 * 2. Fills missing required fields with a placeholder message.
 * 3. Returns a FallbackResult indicating what was salvaged.
 *
 * ISOLATION: No React, Next.js, Supabase, or apps/web imports.
 */

import type { OutputContract } from "@cognitive-forge/core";
import type { RepairResult } from "./repair-loop";

// ── Constants ─────────────────────────────────────────────────────────────────

const FALLBACK_PLACEHOLDER = "[Generation failed — please try again]" as const;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FallbackResult {
  /** The salvaged output (may contain placeholders for missing fields). */
  output: Record<string, unknown>;
  /** Whether fallback was used (true = repair failed, partial salvage applied). */
  fallback_used: boolean;
  /** Human-readable description of what happened. */
  reason: string;
}

// ── Handler ───────────────────────────────────────────────────────────────────

/**
 * Handles failed repair by salvaging partial output.
 *
 * @param contract     - OutputContract defining required and all fields.
 * @param failedOutput - The last output from the failed repair loop.
 * @param repairResult - The result from repairLoop().
 * @returns FallbackResult with salvaged output and metadata.
 */
export function handleFallback(
  contract: OutputContract,
  failedOutput: Record<string, unknown>,
  repairResult: RepairResult
): FallbackResult {
  // If repair succeeded, no fallback needed
  if (repairResult.repaired) {
    return {
      output:        repairResult.output,
      fallback_used: false,
      reason:        `Repair succeeded on attempt ${repairResult.attempts}`,
    };
  }

  // Repair failed — salvage what we can
  const salvaged: Record<string, unknown> = {};
  const missingFields: string[] = [];
  const preservedFields: string[] = [];

  for (const field of contract.fields) {
    const value = failedOutput[field.key];
    const isRequired = contract.required_fields.includes(field.key);

    if (value !== undefined && value !== null && value !== "") {
      // Preserve valid existing field
      salvaged[field.key] = value;
      if (isRequired) {
        preservedFields.push(field.key);
      }
    } else if (isRequired) {
      // Missing required field — fill with placeholder
      salvaged[field.key] = FALLBACK_PLACEHOLDER;
      missingFields.push(field.key);
    }
    // Optional missing fields are simply omitted
  }

  const parts: string[] = [
    `Repair failed after ${repairResult.attempts} attempt(s).`,
  ];
  if (preservedFields.length > 0) {
    parts.push(`Preserved ${preservedFields.length} valid field(s): ${preservedFields.join(", ")}.`);
  }
  if (missingFields.length > 0) {
    parts.push(`Filled ${missingFields.length} missing required field(s) with placeholder: ${missingFields.join(", ")}.`);
  }

  return {
    output:        salvaged,
    fallback_used: true,
    reason:        parts.join(" "),
  };
}

/** Exported for testing. */
export { FALLBACK_PLACEHOLDER };
