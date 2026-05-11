/**
 * AppObjectSchema — a deployable AI application entry.
 *
 * An App Object is the record that the platform routes to when a user
 * visits /a/[slug]. It binds a URL slug to either:
 * - A single CasePack (type: "casepack")
 * - A Graph of CasePacks (type: "graph")
 *
 * CROSS-REFERENCE RULE (doc 05):
 *   "App type must reference either casepack_key or graph_key."
 *   - type "casepack" → casepack_key required, graph_key forbidden
 *   - type "graph"    → graph_key required, casepack_key forbidden
 *   Enforced via superRefine (XOR).
 */

import { z } from "zod";
import {
  SlugSchema,
  PackKeySchema,
  CasePackKeySchema,
  GraphKeySchema,
  AppTypeSchema,
  VisibilityLevelSchema,
  JsonObjectSchema,
} from "./primitives";

// ── Schema ────────────────────────────────────────────────────────────────────

export const AppObjectSchema = z
  .object({
    /**
     * URL-safe slug used to route to this app: /a/<slug>
     * Must be unique across the platform.
     */
    slug: SlugSchema,

    /** Human-readable display title. */
    title: z.string().min(1),

    /** Optional longer description shown in app catalogue. */
    description: z.string().optional(),

    /**
     * App execution type.
     * - "casepack" : routes to a single CasePack
     * - "graph"    : routes to a SequentialGraph
     */
    type: AppTypeSchema,

    /**
     * The CasePack to execute. Required when type is "casepack".
     * Must NOT be set when type is "graph".
     */
    casepack_key: CasePackKeySchema.optional(),

    /**
     * The Graph to execute. Required when type is "graph".
     * Must NOT be set when type is "casepack".
     */
    graph_key: GraphKeySchema.optional(),

    /** Who can access this app. */
    visibility: VisibilityLevelSchema,

    /** The Domain Pack this app belongs to (if any). */
    pack_key: PackKeySchema.optional(),

    /** Arbitrary key-value metadata (e.g. category, icon_url). */
    extra: JsonObjectSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "casepack") {
      // casepack apps must have casepack_key
      if (!data.casepack_key) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'App type "casepack" requires casepack_key to be defined',
          path: ["casepack_key"],
        });
      }
      // casepack apps must NOT have graph_key
      if (data.graph_key) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'App type "casepack" must not define graph_key — use type "graph" instead',
          path: ["graph_key"],
        });
      }
    }

    if (data.type === "graph") {
      // graph apps must have graph_key
      if (!data.graph_key) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'App type "graph" requires graph_key to be defined',
          path: ["graph_key"],
        });
      }
      // graph apps must NOT have casepack_key
      if (data.casepack_key) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'App type "graph" must not define casepack_key — use type "casepack" instead',
          path: ["casepack_key"],
        });
      }
    }
  });

export type AppObject = z.infer<typeof AppObjectSchema>;
