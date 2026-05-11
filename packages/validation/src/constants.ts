/**
 * Forbidden keys that must never appear in public API responses.
 * Source: /docs/implementation/06_Database_RLS_Spec.md
 *
 * This constant is established here at S00-T03 so it can be referenced
 * by tests in Sprint 01 before the full sanitizer is implemented.
 */
export const FORBIDDEN_PUBLIC_KEYS = [
  "casepack_json",
  "manifest_json",
  "graph_json",
  "taskflow_cx",
  "K_REF",
  "runtime_contract",
  "model_policy",
  "bridge_output_json",
  "source_output_json",
  "target_input_json",
  "context_checkpoint_json",
  "trace_payload",
  "repair_attempts",
  "execution_plan",
] as const;

export type ForbiddenPublicKey = (typeof FORBIDDEN_PUBLIC_KEYS)[number];
