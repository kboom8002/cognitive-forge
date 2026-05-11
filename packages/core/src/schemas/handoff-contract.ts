/**
 * HandoffContractSchema — defines the data handoff between two CasePacks.
 *
 * A HandoffContract specifies which output fields from a source CasePack
 * map to which input fields of a target CasePack, and how context is preserved
 * across the node boundary.
 *
 * Used as a sub-object inside BridgeCasePackSchema.
 */

import { z } from "zod";
import { CasePackKeySchema } from "./primitives";
import { FieldDefSchema } from "./fields";

// ── Schema ────────────────────────────────────────────────────────────────────

export const HandoffContractSchema = z.object({
  /** The CasePack producing the output to be handed off. */
  source_casepack_key: CasePackKeySchema,

  /** The CasePack receiving the transformed input. */
  target_casepack_key: CasePackKeySchema,

  /**
   * The fields being transferred.
   * At least one field must be handed off — an empty bridge is meaningless.
   */
  fields: z.array(FieldDefSchema).min(1, {
    message: "HandoffContract must specify at least one field to transfer",
  }),

  /**
   * Context preservation strategy across the node boundary.
   * - full    : entire source context passed to target
   * - partial : only declared fields passed (default)
   * - none    : no context — target starts fresh with only mapped fields
   */
  context_preservation: z
    .enum(["full", "partial", "none"])
    .default("partial"),
});

export type HandoffContract = z.infer<typeof HandoffContractSchema>;
