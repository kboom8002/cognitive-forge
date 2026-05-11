/**
 * mapping-rule-executor.ts — Executes BridgeCasePack mapping_rules.
 *
 * Transforms source CasePack output fields into target CasePack input fields
 * by applying the ordered mapping_rules array from a BridgeCasePack definition.
 *
 * RULES:
 * - Source output must NOT be passed raw into a target CasePack without a bridge.
 * - Only explicitly mapped fields reach the target (allow-list approach).
 * - default_values fill target fields not covered by mapping_rules.
 * - Transforms are applied via the whitelisted applyTransform() function.
 *
 * SECURITY: bridge_output_json, source_output_json, target_input_json
 * are FORBIDDEN public keys. MappingResult is internal — never in public response.
 */

import type { BridgeCasePack } from "@cognitive-forge/core";
import { applyTransform } from "./transforms";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Internal result of executing mapping rules. */
export interface MappingResult {
  /** The mapped output — to be used as the target CasePack's input. */
  readonly mapped: Record<string, unknown>;
  /** Source fields not referenced by any mapping rule. */
  readonly unmapped_source: string[];
  /** Target pattern keys that ended up with no value after mapping + defaults. */
  readonly missing_target: string[];
}

// ── Executor ──────────────────────────────────────────────────────────────────

/**
 * Executes the mapping_rules of a BridgeCasePack against a source output.
 *
 * @param sourceOutput - Output from the source CasePack.
 * @param bridge       - The BridgeCasePack definition.
 * @returns            MappingResult with mapped data and diagnostic metadata.
 */
export function executeMappingRules(
  sourceOutput: Record<string, unknown>,
  bridge: BridgeCasePack
): MappingResult {
  const { mapping_rules, default_values, source_pattern, target_pattern } = bridge;
  const mapped: Record<string, unknown> = {};

  // Track which source fields were referenced by at least one rule
  const referencedSourceFields = new Set<string>();

  // ── Step 1: Apply each mapping rule ──────────────────────────────────────
  for (const rule of mapping_rules) {
    referencedSourceFields.add(rule.source_field);
    const rawValue = sourceOutput[rule.source_field];

    // Apply transform (defaults to copy if undefined)
    const transformedValue = rule.transform
      ? applyTransform(rawValue, rule.transform)
      : rawValue;

    mapped[rule.target_field] = transformedValue;
  }

  // ── Step 2: Apply default_values for still-undefined target fields ────────
  if (default_values && typeof default_values === "object") {
    for (const [key, defaultVal] of Object.entries(default_values)) {
      if (mapped[key] === undefined) {
        mapped[key] = defaultVal;
      }
    }
  }

  // ── Step 3: Compute diagnostic metadata ──────────────────────────────────
  const sourceKeys = Object.keys(sourceOutput);
  const unmapped_source = sourceKeys.filter((k) => !referencedSourceFields.has(k));

  // Target fields expected by target_pattern that are still absent
  const targetPatternKeys = Object.keys(
    target_pattern && typeof target_pattern === "object" ? target_pattern : {}
  );
  const missing_target = targetPatternKeys.filter(
    (k) => mapped[k] === undefined || mapped[k] === null
  );

  return {
    mapped,
    unmapped_source,
    missing_target,
  };
}
