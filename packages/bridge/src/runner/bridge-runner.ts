/**
 * bridge-runner.ts — Orchestrates one bridge edge execution.
 *
 * A BridgeRunner transforms the output of a source CasePack node into
 * the input of a target CasePack node by executing the BridgeCasePack
 * definition that sits on the graph edge between them.
 *
 * Execution flow (doc 08):
 *   1. Validate source_output against source_pattern.
 *   2. Execute mapping_rules → MappingResult.
 *   3. Apply default_values (within MappingRuleExecutor).
 *   4. Validate mapped result against handoff_contract.
 *   5. Validate mapped result against target_pattern.
 *   6. Build ContextCheckpoint.
 *   7. Optionally write handoff_event (if graphRunId is provided).
 *   8. Return BridgeRunResult.
 *
 * SECURITY RULES:
 * - Raw source_output must NEVER be passed directly to target without bridge.
 * - BridgeRunResult is an internal object — NEVER included in public API responses.
 * - bridge_output_json, source_output_json, target_input_json,
 *   context_checkpoint_json are ALL FORBIDDEN public keys.
 *
 * ISOLATION:
 *   ✓ May import @cognitive-forge/core (schemas, types)
 *   ✓ May import @cognitive-forge/casepack
 *   ✗ Must NOT import React, Next.js, or @cognitive-forge/ui-forge
 *   ✗ Must NOT import Supabase directly
 */

import type { BridgeCasePack } from "@cognitive-forge/core";
import { executeMappingRules } from "../mapping/mapping-rule-executor";
import type { MappingResult } from "../mapping/mapping-rule-executor";
import { validateHandoff } from "../validation/handoff-validator";
import type { HandoffValidationResult } from "../validation/handoff-validator";
import { buildContextCheckpoint } from "../checkpoint/context-checkpoint";
import type { ContextCheckpoint } from "../checkpoint/context-checkpoint";

// ── Handoff event writer interface ────────────────────────────────────────────

/**
 * Minimal interface for writing handoff_events to persistent storage.
 * Injected by SequentialGraphRunner — never imported from Supabase directly.
 */
export interface IHandoffEventStore {
  write(event: HandoffEvent): Promise<void>;
}

/** A persisted record of a bridge handoff. */
export interface HandoffEvent {
  readonly graph_run_id:    string;
  readonly bridge_key:      string;
  readonly source_node_id:  string;
  readonly target_node_id:  string;
  readonly source_casepack_key: string;
  readonly target_casepack_key: string;
  readonly validation_passed:   boolean;
  readonly error_count:         number;
  readonly created_at:          string;
}

// ── Source pattern validation ─────────────────────────────────────────────────

export interface SourcePatternValidationResult {
  readonly valid:   boolean;
  readonly missing: string[];   // expected source keys absent from source_output
}

/**
 * Validates that source_output contains the keys declared in source_pattern.
 */
function validateSourcePattern(
  sourceOutput: Record<string, unknown>,
  sourcePattern: Record<string, unknown>
): SourcePatternValidationResult {
  const missing: string[] = [];
  for (const key of Object.keys(sourcePattern)) {
    if (sourceOutput[key] === undefined || sourceOutput[key] === null) {
      missing.push(key);
    }
  }
  return { valid: missing.length === 0, missing };
}

// ── Target pattern validation ─────────────────────────────────────────────────

export interface TargetPatternValidationResult {
  readonly valid:   boolean;
  readonly missing: string[];   // target keys still absent after mapping + defaults
}

/**
 * Validates that the mapped result contains the keys declared in target_pattern.
 */
function validateTargetPattern(
  mapped:        Record<string, unknown>,
  targetPattern: Record<string, unknown>
): TargetPatternValidationResult {
  const missing: string[] = [];
  for (const key of Object.keys(targetPattern)) {
    const val = mapped[key];
    if (val === undefined || val === null) {
      missing.push(key);
    }
  }
  return { valid: missing.length === 0, missing };
}

// ── BridgeRunResult ───────────────────────────────────────────────────────────

/**
 * Internal result of a single bridge edge execution.
 *
 * SECURITY: This is an internal object. It must NEVER be serialized
 * into a public API response. The client receives only the final,
 * sanitized output of the terminal node.
 */
export interface BridgeRunResult {
  /** Mapped data — ready to be used as the target node's input. */
  readonly target_input:             Record<string, unknown>;
  /** Context checkpoint for this edge. */
  readonly checkpoint:               ContextCheckpoint;
  /** Source pattern validation result. */
  readonly source_validation:        SourcePatternValidationResult;
  /** Target pattern validation result. */
  readonly target_validation:        TargetPatternValidationResult;
  /** Handoff contract validation result. */
  readonly handoff_validation:       HandoffValidationResult;
  /** Detailed mapping diagnostics. */
  readonly mapping_result:           MappingResult;
  /** Whether the bridge result is usable (all validations passed). */
  readonly is_valid:                 boolean;
  /** Source node ID. */
  readonly source_node_id:           string;
  /** Target node ID. */
  readonly target_node_id:           string;
  /** Bridge key from the graph edge. */
  readonly bridge_key:               string;
}

// ── BridgeRunContext ──────────────────────────────────────────────────────────

export interface BridgeRunContext {
  /** The BridgeCasePack definition from the graph edge. */
  bridge:        BridgeCasePack;
  /** Full output from the source CasePack node. */
  sourceOutput:  Record<string, unknown>;
  /** Node ID of the source CasePack. */
  sourceNodeId:  string;
  /** Node ID of the target CasePack. */
  targetNodeId:  string;
  /**
   * Optional: graph_run_id used to write a handoff_event.
   * If provided and handoffEventStore is also provided, a handoff_event row is written.
   */
  graphRunId?:   string | undefined;
  /**
   * Optional: store for persisting handoff_event rows.
   * Injected by SequentialGraphRunner — null for standalone/test usage.
   */
  handoffEventStore?: IHandoffEventStore | undefined;
}

// ── Runner ────────────────────────────────────────────────────────────────────

/**
 * Executes a single bridge edge: source output → target input.
 *
 * This is a synchronous-style orchestrator (async only due to optional
 * handoff_event persistence). No AI call is made — bridge execution is
 * purely deterministic data transformation.
 *
 * @param ctx - BridgeRunContext with bridge definition and source output.
 * @returns   BridgeRunResult (internal — never sent to public callers).
 */
export async function runBridge(ctx: BridgeRunContext): Promise<BridgeRunResult> {
  const { bridge, sourceOutput, sourceNodeId, targetNodeId, graphRunId, handoffEventStore } = ctx;

  // ── Step 1: Validate source output against source_pattern ─────────────────
  const sourceValidation = validateSourcePattern(
    sourceOutput,
    (bridge.source_pattern ?? {}) as Record<string, unknown>
  );
  // Note: Missing source keys are non-blocking for MVP — the bridge attempts
  // mapping anyway and the handoff_validation catches critical gaps.

  // ── Step 2 & 3: Execute mapping_rules + apply defaults ────────────────────
  const mappingResult = executeMappingRules(sourceOutput, bridge);
  const { mapped } = mappingResult;

  // ── Step 4: Validate mapped result against handoff_contract ───────────────
  const handoffValidation = validateHandoff(mapped, bridge.handoff_contract);

  // ── Step 5: Validate mapped result against target_pattern ─────────────────
  const targetValidation = validateTargetPattern(
    mapped,
    (bridge.target_pattern ?? {}) as Record<string, unknown>
  );

  // ── Step 6: Build context checkpoint ─────────────────────────────────────
  const strategy = bridge.handoff_contract.context_preservation ?? "partial";
  const checkpoint = buildContextCheckpoint(
    sourceNodeId,
    targetNodeId,
    sourceOutput,
    mapped,
    strategy
  );

  // ── Step 7: Write handoff event (if graphRunId and store provided) ────────
  const isValid = handoffValidation.valid && targetValidation.valid;

  if (graphRunId && handoffEventStore) {
    const event: HandoffEvent = {
      graph_run_id:         graphRunId,
      bridge_key:           bridge.key,
      source_node_id:       sourceNodeId,
      target_node_id:       targetNodeId,
      source_casepack_key:  bridge.source_casepack_key,
      target_casepack_key:  bridge.target_casepack_key,
      validation_passed:    isValid,
      error_count:          handoffValidation.errors.length + targetValidation.missing.length,
      created_at:           new Date().toISOString(),
    };
    await handoffEventStore.write(event);
  }

  // ── Step 8: Return BridgeRunResult ────────────────────────────────────────
  return {
    target_input:       mapped,
    checkpoint,
    source_validation:  sourceValidation,
    target_validation:  targetValidation,
    handoff_validation: handoffValidation,
    mapping_result:     mappingResult,
    is_valid:           isValid,
    source_node_id:     sourceNodeId,
    target_node_id:     targetNodeId,
    bridge_key:         bridge.key,
  };
}
