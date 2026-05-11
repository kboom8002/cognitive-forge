/**
 * FieldDefSchema — shared field definition used by InputContract and OutputContract.
 *
 * Both contracts describe their data shape as an array of FieldDef objects.
 * This file is the single source of truth for that definition.
 */

import { z } from "zod";

// ── Field type taxonomy ──────────────────────────────────────────────────────

export const FIELD_TYPES = [
  "string",   // single-line text
  "text",     // multi-line text / markdown
  "number",   // numeric
  "boolean",  // checkbox / toggle
  "select",   // single-choice from options[]
  "multiselect", // multi-choice from options[]
  "date",     // date picker
  "file",     // file upload reference
  "email",    // email address
  "url",      // URL
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

// ── FieldDefSchema ───────────────────────────────────────────────────────────

/**
 * Describes a single data field in an InputContract or OutputContract.
 * Used at design-time (pack authoring) and render-time (DynamicForm / OutputCard).
 */
export const FieldDefSchema = z.object({
  /** Machine key — must be lowercase snake_case. Used as the data property name. */
  key: z
    .string()
    .min(1)
    .regex(/^[a-z_][a-z0-9_]*$/, {
      message: "Field key must be lowercase snake_case (e.g. company_name)",
    }),

  /** Data type — controls DynamicForm widget selection. */
  type: z.enum(FIELD_TYPES),

  /** Human-readable label displayed in the UI. */
  label: z.string().min(1),

  /** Optional longer description shown as helper text. */
  description: z.string().optional(),

  /** Optional placeholder text for input widgets. */
  placeholder: z.string().optional(),

  /**
   * Allowed values for `select` / `multiselect` fields.
   * Must be non-empty when type is "select" or "multiselect".
   */
  options: z.array(z.string().min(1)).optional(),

  /** Optional regex pattern for client-side validation. */
  validation_regex: z.string().optional(),

  /** Optional default value (always serialised as string). */
  default_value: z.string().optional(),
}).superRefine((data, ctx) => {
  // select / multiselect must have at least one option
  if (
    (data.type === "select" || data.type === "multiselect") &&
    (!data.options || data.options.length === 0)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Field "${data.key}" is type "${data.type}" but has no options defined`,
      path: ["options"],
    });
  }
});

export type FieldDef = z.infer<typeof FieldDefSchema>;
