/**
 * @cognitive-forge/bridge
 *
 * BridgeRunner (inter-node data transformer) — Sprint 07.
 * SequentialGraphRunner — Sprint 07 follow-on task.
 *
 * ISOLATION RULES (enforced at review):
 *   ✓ May import @cognitive-forge/core and @cognitive-forge/casepack
 *   ✗ Must NOT import React or Next.js
 *   ✗ Must NOT import @cognitive-forge/ui-forge
 *   ✗ Must NOT import apps/web
 *   ✗ Must NOT import Supabase client directly (uses injected store interfaces)
 */

export { CORE_VERSION }    from "@cognitive-forge/core";
export { CASEPACK_VERSION } from "@cognitive-forge/casepack";

/** Resolvability sentinel — import this to verify the package links correctly. */
export const BRIDGE_VERSION = "0.1.0" as const;

// ── Transform functions ───────────────────────────────────────────────────────
export { applyTransform } from "./mapping/transforms";
export type { TransformValue } from "./mapping/transforms";

// ── Mapping rule executor ─────────────────────────────────────────────────────
export { executeMappingRules } from "./mapping/mapping-rule-executor";
export type { MappingResult } from "./mapping/mapping-rule-executor";

// ── Handoff validator ─────────────────────────────────────────────────────────
export { validateHandoff } from "./validation/handoff-validator";
export type {
  HandoffValidationResult,
  HandoffValidationError,
} from "./validation/handoff-validator";

// ── Context checkpoint ────────────────────────────────────────────────────────
export { buildContextCheckpoint } from "./checkpoint/context-checkpoint";
export type { ContextCheckpoint } from "./checkpoint/context-checkpoint";

// ── Bridge runner ─────────────────────────────────────────────────────────────
export { runBridge } from "./runner/bridge-runner";
export type {
  BridgeRunContext,
  BridgeRunResult,
  HandoffEvent,
  IHandoffEventStore,
  SourcePatternValidationResult,
  TargetPatternValidationResult,
} from "./runner/bridge-runner";

// ── Compatibility ─────────────────────────────────────────────────────────────
export {
  checkBridgeCompatibility,
  sanitizeCompatibilityReport,
} from "./compatibility-checker";
export type { BridgeCompatibilityReport } from "./compatibility-checker";
