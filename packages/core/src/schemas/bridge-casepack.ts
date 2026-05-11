/**
 * BridgeCasePackSchema — the transformer between two CasePacks.
 *
 * A BridgeCasePack maps the output of a source CasePack into the input
 * of a target CasePack. It is the "glue" node in a CasePack Graph edge.
 *
 * From doc 03: source_pattern, target_pattern, mapping_rules,
 * default_values, context_checkpoint, handoff_contract.
 *
 * ISOLATION: bridge_output_json, source_output_json, target_input_json,
 * context_checkpoint_json are all FORBIDDEN public keys.
 */

import { z } from "zod";
import {
  BridgeKeySchema,
  CasePackKeySchema,
  SemVerSchema,
  PackStatusSchema,
  JsonObjectSchema,
  ISODateTimeSchema,
} from "./primitives";
import { HandoffContractSchema } from "./handoff-contract";

// ── Mapping rule ──────────────────────────────────────────────────────────────

const MappingRuleSchema = z.object({
  /** Key of the field in the source CasePack's output. */
  source_field: z.string().min(1),

  /** Key of the field in the target CasePack's input. */
  target_field: z.string().min(1),

  /**
   * Optional transformation expression (evaluated by BridgeRunner).
   * e.g. "trim(source_value)", "source_value.toUpperCase()"
   * If omitted, value is passed through as-is.
   */
  transform: z.string().optional(),
});

// ── Schema ────────────────────────────────────────────────────────────────────

export const BridgeCasePackSchema = z.object({
  /** Unique bridge key. Format: bridge.<name>.v<version> */
  key: BridgeKeySchema,

  /** Semantic version of this bridge definition. */
  version: SemVerSchema,

  /** Lifecycle status. */
  status: PackStatusSchema,

  /** The CasePack whose output is being transformed. */
  source_casepack_key: CasePackKeySchema,

  /** The CasePack whose input is being populated. */
  target_casepack_key: CasePackKeySchema,

  /**
   * Expected shape/schema of the source output.
   * Used by BridgeRunner to validate source output before mapping.
   */
  source_pattern: JsonObjectSchema,

  /**
   * Expected shape/schema of the target input.
   * Used to validate the bridge output before passing to target.
   */
  target_pattern: JsonObjectSchema,

  /**
   * Ordered list of field-to-field mapping rules.
   * At least one mapping rule is required.
   */
  mapping_rules: z.array(MappingRuleSchema).min(1, {
    message: "BridgeCasePack must define at least one mapping rule",
  }),

  /**
   * Default values for target fields not covered by mapping_rules.
   * Applied after mapping — only fills fields that are still undefined.
   */
  default_values: JsonObjectSchema.optional(),

  /**
   * Context snapshot preserved across the node boundary.
   * FORBIDDEN public key (context_checkpoint_json).
   */
  context_checkpoint: JsonObjectSchema.optional(),

  /** Formal declaration of the data handoff contract. */
  handoff_contract: HandoffContractSchema,

  metadata: z
    .object({
      title: z.string().min(1),
      description: z.string().optional(),
      created_at: ISODateTimeSchema.optional(),
      updated_at: ISODateTimeSchema.optional(),
    })
    .optional(),
});

export type BridgeCasePack = z.infer<typeof BridgeCasePackSchema>;
