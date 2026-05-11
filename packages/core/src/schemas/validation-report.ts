/**
 * ValidationReportSchema — the result of validating a CasePack's output.
 *
 * Produced by the validation layer after each AI execution. Consumed by:
 * - RepairEngine (determines if repair is needed)
 * - UsageWriter (logged alongside the usage event)
 * - OutputCard (trust badge display)
 * - Public API (sanitised subset only)
 *
 * CROSS-REFERENCE RULE (task card, doc 05):
 *   ValidationReport with blocking errors MUST NOT have status "pass".
 *   Enforced via superRefine.
 */

import { z } from "zod";
import { ISODateTimeSchema } from "./primitives";

// ── Error entry ───────────────────────────────────────────────────────────────

export const ValidationErrorSchema = z.object({
  /** Machine-readable error code (e.g. "MISSING_REQUIRED_FIELD"). */
  code: z.string().min(1),

  /** Human-readable description of the violation. */
  message: z.string().min(1),

  /** JSON path to the offending field (e.g. ["output", "statement"]). */
  path: z.array(z.string()).optional(),

  /**
   * Whether this error blocks the output from being used.
   * Blocking errors trigger the RepairEngine.
   * Non-blocking errors are warnings escalated as errors.
   */
  blocking: z.boolean().default(true),
});

export type ValidationError = z.infer<typeof ValidationErrorSchema>;

// ── Schema ────────────────────────────────────────────────────────────────────

export const ValidationReportSchema = z
  .object({
    /** Whether the output passed all validation checks. */
    valid: z.boolean(),

    /**
     * Summary status.
     * - pass    : all required fields present, no blocking errors
     * - fail    : one or more blocking errors — output cannot be used as-is
     * - warning : output usable but non-blocking issues detected
     */
    status: z.enum(["pass", "fail", "warning"]),

    /** Detailed validation errors (may be empty for a passing report). */
    errors: z.array(ValidationErrorSchema),

    /** Non-blocking advisory messages. */
    warnings: z.array(z.string()).optional(),

    /** ISO timestamp of when validation was performed. */
    checked_at: ISODateTimeSchema,

    /** Optional schema version for report format evolution. */
    schema_version: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const hasBlockingErrors = data.errors.some((e) => e.blocking !== false);

    // RULE: blocking errors → status must not be "pass"
    if (hasBlockingErrors && data.status === "pass") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'ValidationReport has blocking errors but status is "pass" — status must be "fail"',
        path: ["status"],
      });
    }

    // RULE: valid:false → status must not be "pass"
    if (!data.valid && data.status === "pass") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'ValidationReport has valid:false but status is "pass" — inconsistent state',
        path: ["status"],
      });
    }

    // RULE: valid:true and status:"fail" are inconsistent
    if (data.valid && data.status === "fail") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'ValidationReport has valid:true but status is "fail" — inconsistent state',
        path: ["valid"],
      });
    }
  });

export type ValidationReport = z.infer<typeof ValidationReportSchema>;
