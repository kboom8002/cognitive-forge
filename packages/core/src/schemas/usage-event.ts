/**
 * UsageEventSchema — token consumption and cost record per AI execution.
 *
 * Written by the UsageWriter (packages/runtime) after each successful or
 * failed CasePack / Graph execution. Used for:
 * - Workspace billing and quota enforcement
 * - Per-pack usage analytics
 * - Cost attribution by provider and model
 */

import { z } from "zod";
import {
  UUIDSchema,
  ISODateTimeSchema,
  CasePackKeySchema,
  AIProviderSchema,
  GraphKeySchema,
} from "./primitives";

// ── Schema ────────────────────────────────────────────────────────────────────

export const UsageEventSchema = z.object({
  /** UUID identifying the run that generated this usage. */
  run_id: UUIDSchema,

  /** UUID of the workspace that owns this usage. */
  workspace_id: UUIDSchema,

  /** CasePack that was executed, if a single-casepack run. */
  casepack_key: CasePackKeySchema.optional(),

  /** Graph that was executed, if a sequential-graph run. */
  graph_key: GraphKeySchema.optional(),

  /** AI provider used for this execution. */
  provider: AIProviderSchema,

  /** Model identifier (provider-specific). */
  model: z.string().min(1, { message: "model is required" }),

  /** Number of prompt/input tokens consumed. */
  tokens_in: z.number().int().nonnegative(),

  /** Number of completion/output tokens produced. */
  tokens_out: z.number().int().nonnegative(),

  /** Estimated cost in USD (may be null if not calculable). */
  cost_usd: z.number().nonnegative().optional(),

  /** Number of repair attempts made during this run (0 if none). */
  repair_attempts: z.number().int().nonnegative().default(0),

  /** ISO timestamp when the usage event was recorded. */
  created_at: ISODateTimeSchema,
});

export type UsageEvent = z.infer<typeof UsageEventSchema>;
