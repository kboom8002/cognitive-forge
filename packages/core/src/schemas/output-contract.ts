/**
 * OutputContractSchema — describes the output shape of a CasePack.
 *
 * The OutputContract is used to:
 * 1. Validate AI-generated output at runtime.
 * 2. Render OutputCard widgets from the result.
 * 3. Define what fields are safe to expose publicly.
 *
 * Cross-reference rule (doc 05):
 *   "Output required_fields must exist in schema."
 *   All keys in `required_fields` must exist in `fields[].key`.
 *   Enforced via superRefine.
 */

import { z } from "zod";
import { FieldDefSchema } from "./fields";

// ── Schema ───────────────────────────────────────────────────────────────────

export const OutputContractSchema = z
  .object({
    /**
     * The ordered list of output fields produced by the AI.
     * At least one field is required — a CasePack with no output is meaningless.
     */
    fields: z.array(FieldDefSchema).min(1, {
      message: "OutputContract must have at least one field",
    }),

    /**
     * Keys of fields that the AI MUST always produce.
     * Validated after AI execution — missing required fields trigger repair.
     * Must be a subset of fields[].key.
     */
    required_fields: z.array(z.string()),

    /**
     * Keys of fields that are safe to expose in public API responses.
     * Fields NOT in this list are stripped by the sanitizer.
     * Must be a subset of fields[].key.
     */
    public_fields: z.array(z.string()).optional(),

    /** Optional schema version for migration tracking. */
    schema_version: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const fieldKeys = new Set(data.fields.map((f) => f.key));

    // Cross-reference rule: required_fields keys must exist in fields[]
    for (const rf of data.required_fields) {
      if (!fieldKeys.has(rf)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `required_fields references unknown field key: "${rf}" (not found in fields[])`,
          path: ["required_fields"],
        });
      }
    }

    // Cross-reference rule: public_fields keys must exist in fields[]
    if (data.public_fields) {
      for (const pf of data.public_fields) {
        if (!fieldKeys.has(pf)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `public_fields references unknown field key: "${pf}" (not found in fields[])`,
            path: ["public_fields"],
          });
        }
      }
    }
  });

export type OutputContract = z.infer<typeof OutputContractSchema>;
