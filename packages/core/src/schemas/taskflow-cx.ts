/**
 * TaskflowCXSchema — the core instruction object for a CasePack.
 *
 * TASKFLOW-CX encodes the "cognitive contract" for an AI task:
 * Role, Situation, Task, Knowledge (REF/IN/EX), Watchouts, Flow,
 * Language, and Output Contract specification.
 *
 * REQUIRED by doc 05:
 *   - W_watchouts  (explicit failure modes the AI must avoid)
 *   - O_output_contract  (natural-language spec for the expected output)
 *
 * K_REF = stable reference knowledge (embedded at pack-build time)
 * K_IN  = runtime injected input knowledge (from user / system)
 * K_EX  = few-shot examples
 */

import { z } from "zod";

// ── Schema ───────────────────────────────────────────────────────────────────

export const TaskflowCXSchema = z.object({
  /** R — Role / Audience. Who the AI is acting as. */
  R_role: z.string().min(1, { message: "R_role is required" }),

  /** S — Situation / Scope. Context and constraints of the task. */
  S_situation: z.string().min(1, { message: "S_situation is required" }),

  /** T — Task / Target. The specific action the AI must perform. */
  T_task: z.string().min(1, { message: "T_task is required" }),

  /**
   * K_REF — Stable reference knowledge.
   * Embedded at pack-build time. Must NOT contain PII or runtime data.
   * This field is the "Knowledge Firewall" anchor — it is the K_REF
   * defined in doc 03 and must not be exposed publicly.
   */
  K_REF: z.string().optional(),

  /** K_IN — Runtime input knowledge injected per execution. */
  K_IN: z.string().optional(),

  /** K_EX — Few-shot examples to guide output quality. */
  K_EX: z.string().optional(),

  /**
   * W — Watchouts.
   * REQUIRED. Explicit list of failure modes, anti-patterns, and
   * guardrails the AI must actively avoid. Cannot be empty.
   */
  W_watchouts: z.string().min(1, {
    message: "W_watchouts is required — list failure modes the AI must avoid",
  }),

  /** F — Flow. Step-by-step reasoning or processing instructions. */
  F_flow: z.string().optional(),

  /** L — Language / Tone. Style and register for the output. */
  L_language: z.string().optional(),

  /**
   * O — Output Contract specification.
   * REQUIRED. Describes the expected output format, structure, and
   * constraints in natural language. The structured OutputContractSchema
   * is a separate sibling field in CasePackMAO.
   */
  O_output_contract: z.string().min(1, {
    message: "O_output_contract is required — describe the expected output format",
  }),
});

export type TaskflowCX = z.infer<typeof TaskflowCXSchema>;
