/**
 * UISchemaSchema — rendering configuration for a CasePack's UI.
 *
 * Controls how DynamicForm (input) and OutputCard (output) render
 * in the UI Forge layer. Supports two app modes (doc 05):
 *   - micro_app      : single CasePack, simple form + result card
 *   - composite_app  : multi-node graph, step-by-step wizard or tabbed UI
 *
 * ISOLATION: no React imports — this is pure configuration data.
 * UI Forge (packages/ui-forge) consumes this schema at render time.
 */

import { z } from "zod";

// ── App mode ─────────────────────────────────────────────────────────────────

export const APP_MODE = {
  MICRO_APP:     "micro_app",
  COMPOSITE_APP: "composite_app",
} as const;

export type AppMode = (typeof APP_MODE)[keyof typeof APP_MODE];

// ── Layout options ────────────────────────────────────────────────────────────

export const UI_LAYOUT = {
  SINGLE_COLUMN: "single_column",
  TWO_COLUMN:    "two_column",
  WIZARD:        "wizard",   // step-by-step — required for composite_app
  TABBED:        "tabbed",   // node output tabs
} as const;

// ── Field-level override ──────────────────────────────────────────────────────

/**
 * Per-field rendering overrides applied on top of FieldDefSchema defaults.
 * Keys match FieldDef.key values from InputContract or OutputContract.
 */
export const FieldOverrideSchema = z.object({
  /** Override the display label. */
  label: z.string().optional(),
  /** Override the placeholder text. */
  placeholder: z.string().optional(),
  /** Hide this field from the rendered UI entirely. */
  hidden: z.boolean().optional(),
  /** Explicit render order (lower = earlier). */
  order: z.number().int().optional(),
  /** CSS width hint: "full" | "half" | "third". */
  width: z.enum(["full", "half", "third"]).optional(),
});

export type FieldOverride = z.infer<typeof FieldOverrideSchema>;

// ── UISchemaSchema ────────────────────────────────────────────────────────────

export const UISchemaSchema = z
  .object({
    /**
     * App rendering mode. REQUIRED.
     * - micro_app: single CasePack UI (form → result card)
     * - composite_app: graph UI (wizard / tabs across multiple nodes)
     */
    app_mode: z.enum([APP_MODE.MICRO_APP, APP_MODE.COMPOSITE_APP]),

    /**
     * Layout style.
     * - Defaults to "single_column" for micro_app.
     * - Defaults to "wizard" for composite_app.
     */
    layout: z
      .enum([
        UI_LAYOUT.SINGLE_COLUMN,
        UI_LAYOUT.TWO_COLUMN,
        UI_LAYOUT.WIZARD,
        UI_LAYOUT.TABBED,
      ])
      .optional(),

    /**
     * Per-field rendering overrides keyed by FieldDef.key.
     * Applied on top of FieldDef defaults at render time.
     */
    field_overrides: z.record(z.string(), FieldOverrideSchema).optional(),

    /**
     * Public mode: when true, sensitive fields are hidden and
     * only public_fields from OutputContract are rendered.
     * Used for unauthenticated/embedded app views.
     */
    public_mode: z.boolean().default(false),

    /**
     * Show trust badge in the output card.
     * Displays AI model, provider, and pack version metadata.
     */
    trust_badge: z.boolean().default(true),

    /**
     * Optional submit button label override.
     * Defaults to "Run" for micro_app, "Start" for composite_app.
     */
    submit_label: z.string().max(40).optional(),
  })
  .superRefine((data, ctx) => {
    // composite_app should use wizard or tabbed layout — warn if single_column chosen
    if (
      data.app_mode === APP_MODE.COMPOSITE_APP &&
      data.layout === UI_LAYOUT.SINGLE_COLUMN
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'composite_app with layout "single_column" is not recommended — use "wizard" or "tabbed"',
        path: ["layout"],
      });
    }
  });

export type UISchema = z.infer<typeof UISchemaSchema>;
