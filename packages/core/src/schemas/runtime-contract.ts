/**
 * RuntimeContractSchema — specifies AI execution parameters for a CasePack.
 *
 * Supports three execution modes (doc 05):
 *   - single_casepack   : one CasePack executed in isolation
 *   - bridge_casepack   : two CasePacks connected via a BridgeCasePack transformer
 *   - sequential_graph  : a DAG of CasePacks executed via SequentialGraphRunner
 *
 * Implemented as a Zod discriminated union on `execution_type` so the
 * TypeScript type narrows correctly in each branch.
 */

import { z } from "zod";
import { AIProviderSchema } from "./primitives";
import { BridgeKeySchema } from "./primitives";

// ── Shared base fields ───────────────────────────────────────────────────────

const BaseRuntimeFields = {
  /** AI provider to use for this execution. */
  provider: AIProviderSchema,

  /** Model identifier (provider-specific). e.g. "gpt-4o", "claude-3-5-sonnet". */
  model: z.string().min(1, { message: "model is required" }),

  /**
   * Sampling temperature. Range: 0.0 (deterministic) to 2.0 (creative).
   * Defaults to provider default if omitted.
   */
  temperature: z.number().min(0).max(2).optional(),

  /** Maximum tokens the model may produce in a single response. */
  max_tokens: z.number().int().positive().optional(),

  /** Execution wall-clock timeout in milliseconds. */
  timeout_ms: z.number().int().positive().optional(),

  /** Whether to enable RepairEngine on output validation failure. */
  repair_enabled: z.boolean().default(true),

  /** Maximum repair attempts before giving up. Default: 2. */
  max_repair_attempts: z.number().int().min(1).max(5).default(2),
};

// ── Discriminated union branches ─────────────────────────────────────────────

/** Single CasePack executed in isolation. */
export const SingleCasePackRuntimeSchema = z.object({
  execution_type: z.literal("single_casepack"),
  ...BaseRuntimeFields,
});

/**
 * Two CasePacks connected via a BridgeCasePack.
 * The bridge transformer maps source output → target input.
 */
export const BridgeCasePackRuntimeSchema = z.object({
  execution_type: z.literal("bridge_casepack"),
  ...BaseRuntimeFields,
  /** Key of the BridgeCasePack that performs the transformation. */
  bridge_key: BridgeKeySchema,
});

/**
 * A directed acyclic graph of CasePacks executed by SequentialGraphRunner.
 * The graph is resolved at runtime from the CasePackGraph registry.
 */
export const SequentialGraphRuntimeSchema = z.object({
  execution_type: z.literal("sequential_graph"),
  ...BaseRuntimeFields,
  /** Key of the CasePackGraph to execute. */
  graph_key: z.string().min(1, { message: "graph_key is required for sequential_graph" }),
});

// ── Union ────────────────────────────────────────────────────────────────────

export const RuntimeContractSchema = z.discriminatedUnion("execution_type", [
  SingleCasePackRuntimeSchema,
  BridgeCasePackRuntimeSchema,
  SequentialGraphRuntimeSchema,
]);

export type RuntimeContract = z.infer<typeof RuntimeContractSchema>;
export type SingleCasePackRuntime = z.infer<typeof SingleCasePackRuntimeSchema>;
export type BridgeCasePackRuntime = z.infer<typeof BridgeCasePackRuntimeSchema>;
export type SequentialGraphRuntime = z.infer<typeof SequentialGraphRuntimeSchema>;
