/**
 * CasePackMAOSchema — the top-level definition of a single AI micro-app.
 *
 * A CasePack-MAO (Mission / Audience / Output) bundles together:
 * - TASKFLOW-CX instruction object
 * - InputContract (what data the user provides)
 * - OutputContract (what the AI produces)
 * - RuntimeContract (which AI provider / model / execution type)
 * - UISchema (how the form and result card render)
 * - Optional policy_pack, evals, and metadata
 *
 * The key uses the format: casepack.<name>.v<version>
 *
 * ISOLATION: casepack_json (the serialised form of this object) is a
 * FORBIDDEN public key — it must never be returned in a public API response.
 */

import { z } from "zod";
import {
  CasePackKeySchema,
  SemVerSchema,
  PackStatusSchema,
  JsonObjectSchema,
  ISODateTimeSchema,
} from "./primitives";
import { TaskflowCXSchema } from "./taskflow-cx";
import { InputContractSchema } from "./input-contract";
import { OutputContractSchema } from "./output-contract";
import { RuntimeContractSchema } from "./runtime-contract";
import { UISchemaSchema } from "./ui-schema";

// ── Pack metadata ─────────────────────────────────────────────────────────────

const CasePackMetadataSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  created_at: ISODateTimeSchema.optional(),
  updated_at: ISODateTimeSchema.optional(),
});

// ── Schema ────────────────────────────────────────────────────────────────────

export const CasePackMAOSchema = z.object({
  /** Unique pack key. Format: casepack.<name>.v<version> */
  key: CasePackKeySchema,

  /** Semantic version of this pack definition. */
  version: SemVerSchema,

  /** Lifecycle status of this pack. */
  status: PackStatusSchema,

  /**
   * The TASKFLOW-CX instruction object.
   * Contains the cognitive contract for the AI task.
   */
  taskflow_cx: TaskflowCXSchema,

  /** Describes the input the user must provide. */
  input_contract: InputContractSchema,

  /** Describes the output the AI must produce. */
  output_contract: OutputContractSchema,

  /** Specifies the AI provider, model, and execution mode. */
  runtime_contract: RuntimeContractSchema,

  /** Controls how DynamicForm and OutputCard render this pack. */
  ui_schema: UISchemaSchema,

  /**
   * Optional guardrails policy configuration.
   * Schema TBD — stored as flexible JSON for now.
   */
  policy_pack: JsonObjectSchema.optional(),

  /**
   * Optional evaluation fixtures for automated quality gating.
   * Each item is a test case (input + expected output assertions).
   */
  evals: z.array(JsonObjectSchema).optional(),

  /** Human-readable display metadata. */
  metadata: CasePackMetadataSchema.optional(),
});

export type CasePackMAO = z.infer<typeof CasePackMAOSchema>;
