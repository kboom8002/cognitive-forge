/**
 * @cognitive-forge/validation
 *
 * Input/output contract validators, forbidden-key sanitizer,
 * and public-response sanitization (strips internal fields before API response).
 *
 * ISOLATION RULES (enforced at review):
 *   ✓ May import @cognitive-forge/core
 *   ✗ Must NOT import React, Next.js, or Supabase
 *   ✗ Must NOT import @cognitive-forge/runtime or bridge
 *   ✗ Must NOT import apps/web
 *
 * Forbidden public keys (doc 06): casepack_json, manifest_json, graph_json,
 * taskflow_cx, K_REF, runtime_contract, model_policy, bridge_output_json,
 * source_output_json, target_input_json, context_checkpoint_json,
 * trace_payload, repair_attempts, execution_plan.
 *
 * Sprint 01/02 will add: validateInput(), validateOutput(),
 * sanitizePublicResponse(), FORBIDDEN_PUBLIC_KEYS constant.
 */

export { CORE_VERSION } from "@cognitive-forge/core";

/** Resolvability sentinel — import this to verify the package links correctly. */
export const VALIDATION_VERSION = "0.0.1" as const;

export * from "./constants";
export { validateInput, validateOutput } from "./validators";
export { sanitizePublicResponse, deepSanitize } from "./sanitize";

// ── v2.0 Evidence Grounding & Release Evaluation ─────────────────────────────
export {
  detectFactConflicts,
} from "./evidence/fact-conflict-detector";
export type {
  SourceDocumentInput,
  FactConflictItem,
  FactConflictReport,
} from "./evidence/fact-conflict-detector";

export {
  runEvaluationSuite,
  qualifyRelease,
} from "./evaluation/evaluation-runner";
export type {
  EvaluationRunInput,
  EvaluationCheckResult,
  QualifyReleaseInput,
} from "./evaluation/evaluation-runner";

