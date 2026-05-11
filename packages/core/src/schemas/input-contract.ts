/**
 * InputContractSchema — describes the input shape of a CasePack.
 *
 * The InputContract is used at design-time to generate DynamicForm widgets
 * and at runtime to validate user-submitted data before AI execution.
 *
 * Cross-reference rule: all keys in `required_fields` must exist in
 * the `fields` array. Enforced via superRefine.
 */

import { z } from "zod";
import { FieldDefSchema } from "./fields";

// ── Schema ───────────────────────────────────────────────────────────────────

export const InputContractSchema = z
  .object({
    /**
     * The ordered list of input fields.
     * At least one field is required for a meaningful CasePack.
     */
    fields: z.array(FieldDefSchema).min(1, {
      message: "InputContract must have at least one field",
    }),

    /**
     * Keys of fields that the user MUST fill in before submission.
     * Must be a subset of fields[].key.
     */
    required_fields: z.array(z.string()),

    /** Optional schema version for migration tracking. */
    schema_version: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const fieldKeys = new Set(data.fields.map((f) => f.key));
    for (const rf of data.required_fields) {
      if (!fieldKeys.has(rf)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `required_fields references unknown field key: "${rf}" (not found in fields[])`,
          path: ["required_fields"],
        });
      }
    }
  });

export type InputContract = z.infer<typeof InputContractSchema>;
