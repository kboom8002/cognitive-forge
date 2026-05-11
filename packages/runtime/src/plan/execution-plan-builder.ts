/**
 * ExecutionPlanBuilder — assembles the AI prompt and provider config
 * from a CasePackMAO and user input.
 *
 * The execution plan is an INTERNAL object:
 *   - Its `prompt` field contains TaskflowCX instructions including K_REF.
 *   - The entire plan is a FORBIDDEN PUBLIC KEY — never expose via public API.
 *
 * Prompt assembly order (TASKFLOW-CX):
 *   R_role → S_situation → T_task → K_REF → K_IN (user input) → K_EX →
 *   W_watchouts → F_flow → L_language → O_output_contract
 *
 * ISOLATION: No React, Next.js, Supabase, or apps/web imports.
 */

import type { CasePackMAO } from "@cognitive-forge/core";

// ── ExecutionPlan ─────────────────────────────────────────────────────────────

/**
 * The complete execution plan for a single CasePack run.
 *
 * FORBIDDEN: This object must never be exposed in public API responses.
 * See FORBIDDEN_PUBLIC_KEYS in @cognitive-forge/validation.
 */
export interface ExecutionPlan {
  /** UUID of the casepack_runs row this plan belongs to. */
  run_id: string;
  /** CasePack key being executed. */
  casepack_key: string;
  /** AI provider name. */
  provider: string;
  /** AI model identifier. */
  model: string;
  /** Sampling temperature. */
  temperature?: number | undefined;
  /** Max completion tokens. */
  max_tokens?: number | undefined;
  /** Timeout in milliseconds. */
  timeout_ms?: number | undefined;
  /** Whether the RepairEngine is enabled. */
  repair_enabled: boolean;
  /** Maximum repair retries before fallback. */
  max_repair_attempts: number;
  /**
   * Fully assembled prompt string.
   * Contains TaskflowCX instructions, K_REF, and K_IN (user input).
   * FORBIDDEN — must not appear in public API responses.
   */
  prompt: string;
  /** ISO 8601 timestamp when this plan was created. */
  created_at: string;
}

// ── Prompt assembly ───────────────────────────────────────────────────────────

/**
 * Formats user input fields as K_IN section of the prompt.
 * Converts Record<string, unknown> to a labelled key-value block.
 */
function formatUserInputAsKIN(
  input: Record<string, unknown>
): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(input)) {
    const formatted =
      Array.isArray(value)
        ? value.join(", ")
        : String(value ?? "");
    lines.push(`${key}: ${formatted}`);
  }
  return lines.join("\n");
}

/**
 * Assembles a TASKFLOW-CX prompt from the CasePackMAO and user input.
 *
 * Sections are only included if they contain non-empty content.
 * The prompt is structured as labelled sections for maximum model clarity.
 */
function buildPrompt(
  mao: CasePackMAO,
  userInput: Record<string, unknown>
): string {
  const cx = mao.taskflow_cx;
  const oc = mao.output_contract;
  const sections: string[] = [];

  // R — Role
  sections.push(`## ROLE\n${cx.R_role}`);

  // S — Situation
  sections.push(`## SITUATION\n${cx.S_situation}`);

  // T — Task
  sections.push(`## TASK\n${cx.T_task}`);

  // K_REF — Stable reference knowledge (if present)
  if (cx.K_REF && cx.K_REF.trim().length > 0) {
    sections.push(`## REFERENCE KNOWLEDGE\n${cx.K_REF}`);
  }

  // K_IN — Runtime user input
  const kinFormatted = formatUserInputAsKIN(userInput);
  if (kinFormatted.trim().length > 0) {
    sections.push(`## USER INPUT\n${kinFormatted}`);
  }

  // K_EX — Few-shot examples (if present)
  if (cx.K_EX && cx.K_EX.trim().length > 0) {
    sections.push(`## EXAMPLES\n${cx.K_EX}`);
  }

  // W — Watchouts (REQUIRED by doc 05)
  sections.push(`## WATCHOUTS\n${cx.W_watchouts}`);

  // F — Flow (if present)
  if (cx.F_flow && cx.F_flow.trim().length > 0) {
    sections.push(`## FLOW\n${cx.F_flow}`);
  }

  // L — Language/Tone (if present)
  if (cx.L_language && cx.L_language.trim().length > 0) {
    sections.push(`## LANGUAGE AND TONE\n${cx.L_language}`);
  }

  // O — Output contract (REQUIRED by doc 05)
  sections.push(`## OUTPUT CONTRACT\n${cx.O_output_contract}`);

  // Append the structured output field list
  const requiredFields = oc.required_fields.join(", ");
  const fieldList = oc.fields.map((f) => `  - ${f.key} (${f.type}): ${f.label}`).join("\n");
  sections.push(
    `## OUTPUT FORMAT\n` +
    `Respond with a valid JSON object containing the following fields:\n${fieldList}\n\n` +
    `Required fields (must be present and non-empty): ${requiredFields}\n` +
    `Do not include any text outside of the JSON object.`
  );

  return sections.join("\n\n");
}

// ── Builder ───────────────────────────────────────────────────────────────────

/**
 * Builds the ExecutionPlan for a single CasePack run.
 *
 * @param runId     - UUID of the casepack_runs row.
 * @param mao       - Fully validated CasePackMAO.
 * @param userInput - Validated user-submitted input fields.
 * @returns         ExecutionPlan (FORBIDDEN — never expose publicly).
 */
export function buildExecutionPlan(
  runId: string,
  mao: CasePackMAO,
  userInput: Record<string, unknown>
): ExecutionPlan {
  const rc = mao.runtime_contract;

  // Extract provider config (runtime_contract is a discriminated union)
  const provider       = rc.provider;
  const model          = rc.model;
  const temperature    = "temperature"     in rc ? rc.temperature     : undefined;
  const max_tokens     = "max_tokens"      in rc ? rc.max_tokens      : undefined;
  const timeout_ms     = "timeout_ms"      in rc ? rc.timeout_ms      : undefined;
  const repairEnabled  = "repair_enabled"  in rc ? rc.repair_enabled  : true;
  const maxRepairAttempts = "max_repair_attempts" in rc ? rc.max_repair_attempts : 2;

  return {
    run_id:              runId,
    casepack_key:        mao.key,
    provider:            provider,
    model:               model,
    ...(temperature    !== undefined ? { temperature }           : {}),
    ...(max_tokens     !== undefined ? { max_tokens }            : {}),
    ...(timeout_ms     !== undefined ? { timeout_ms }            : {}),
    repair_enabled:      repairEnabled,
    max_repair_attempts: maxRepairAttempts,
    prompt:              buildPrompt(mao, userInput),
    created_at:          new Date().toISOString(),
  };
}
