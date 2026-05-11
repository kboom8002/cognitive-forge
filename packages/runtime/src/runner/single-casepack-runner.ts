/**
 * SingleCasePackRunner — orchestrates end-to-end execution of a single CasePack.
 *
 * Execution flow (doc 08):
 *   1. Create casepack_runs row (status: pending).
 *   2. Write trace: start.
 *   3. Validate input against input_contract.
 *   4. Build execution plan from TASKFLOW-CX + user input.
 *   5. Call AIProviderAdapter.
 *   6. Parse JSON output.
 *   7. Validate output against output_contract.
 *   8. If invalid and repair_enabled → run RepairLoop.
 *   9. If repair fails → FallbackHandler.
 *  10. Update casepack_runs row with status + output.
 *  11. Write trace events (output, repair, fallback, complete/error).
 *  12. Write usage event.
 *  13. If publicMode → sanitize output via PublicOutputSanitizer.
 *
 * ISOLATION:
 *   ✗ Must NOT import React, Next.js, or UI Forge.
 *   ✗ Must NOT import Supabase directly (stores are injected).
 */

import { AppError, AppErrorCode } from "@cognitive-forge/core";
import type { CasePackMAO, ValidationReport } from "@cognitive-forge/core";
import type { AIProviderAdapter } from "../ai/ai-provider";
import { validateInput } from "../validators/input-validator";
import { validateOutput } from "../validators/output-validator";
import { buildExecutionPlan } from "../plan/execution-plan-builder";
import type { ExecutionPlan } from "../plan/execution-plan-builder";
import { repairLoop } from "../repair/repair-loop";
import { handleFallback } from "../repair/fallback-handler";
import { sanitizePublicOutput } from "../public/public-output-sanitizer";
import type { TraceWriter } from "../trace/trace-writer";
import type { UsageWriter } from "../trace/usage-writer";

// ── Run store interface ───────────────────────────────────────────────────────

/** Minimal interface for persisting casepack_runs rows. */
export interface IRunStore {
  /** Creates a new run row. Returns the generated run_id (UUID). */
  create(params: {
    workspace_id: string;
    casepack_key: string;
    user_id?:     string | undefined;
    input_json:   Record<string, unknown>;
  }): Promise<string>;

  /** Updates the run row with final status and output. */
  update(runId: string, params: {
    status:           string;
    output_json?:     Record<string, unknown> | undefined;
    execution_plan?:  Record<string, unknown> | undefined;
    repair_attempts?: number | undefined;
    started_at?:      string | undefined;
    completed_at?:    string | undefined;
  }): Promise<void>;
}

// ── RunContext — everything the runner needs ───────────────────────────────────

export interface RunContext {
  /** Workspace that owns this run. */
  workspace_id: string;
  /** Optional user_id if an authenticated user initiated the run. */
  user_id?:     string | undefined;
  /** CasePack key being executed. */
  casepack_key: string;
  /** Fully validated CasePackMAO definition. */
  mao:          CasePackMAO;
  /** User-submitted input values. */
  user_input:   Record<string, unknown>;
  /** AI provider adapter (MockAIProvider, OpenAIAdapter, etc.). */
  adapter:      AIProviderAdapter;
  /** TraceWriter for lifecycle event recording. */
  traceWriter:  TraceWriter;
  /** UsageWriter for token/cost recording. */
  usageWriter:  UsageWriter;
  /** RunStore for casepack_runs row management. */
  runStore:     IRunStore;
  /** When true, output is sanitized through PublicOutputSanitizer. */
  publicMode:   boolean;
  /** When true, trace and usage events are NOT persisted. */
  zeroRetention?: boolean | undefined;
}

// ── RunResult — returned to the caller ────────────────────────────────────────

export interface RunResult {
  /** UUID of the casepack_runs row. */
  run_id:          string;
  /** Final run status. */
  status:          "success" | "failed" | "repaired";
  /** Output values (sanitized if publicMode). */
  output:          Record<string, unknown>;
  /** Final validation report. */
  validation:      ValidationReport;
  /** Number of repair attempts made. */
  repair_attempts: number;
  /** Whether fallback output was used. */
  fallback_used:   boolean;
}

// ── Runner ────────────────────────────────────────────────────────────────────

/**
 * Executes a single CasePack end-to-end.
 *
 * @param ctx - All runtime dependencies injected via RunContext.
 * @returns   RunResult with the final status and (optionally sanitized) output.
 * @throws    AppError(VALIDATION_ERROR) if input validation fails.
 */
export async function runSingleCasePack(ctx: RunContext): Promise<RunResult> {
  const { mao, user_input, adapter, traceWriter, usageWriter, runStore } = ctx;
  const shouldTrace = ctx.zeroRetention !== true;

  // ── Step 1: Create casepack_runs row ────────────────────────────────────────
  const runId = await runStore.create({
    workspace_id: ctx.workspace_id,
    casepack_key: ctx.casepack_key,
    ...(ctx.user_id !== undefined ? { user_id: ctx.user_id } : {}),
    input_json:   user_input,
  });

  const startedAt = new Date().toISOString();

  // Update to running status
  await runStore.update(runId, { status: "running", started_at: startedAt });

  // ── Step 2: Trace start ─────────────────────────────────────────────────────
  if (shouldTrace) {
    await traceWriter.start(runId, ctx.casepack_key, { input_keys: Object.keys(user_input) });
  }

  // ── Step 3: Validate input ──────────────────────────────────────────────────
  const inputReport = validateInput(user_input, mao.input_contract);
  if (!inputReport.valid) {
    const completedAt = new Date().toISOString();
    await runStore.update(runId, { status: "failed", completed_at: completedAt });
    if (shouldTrace) {
      await traceWriter.error(runId, {
        phase:  "input_validation",
        errors: inputReport.errors,
      }, ctx.casepack_key);
    }
    throw new AppError(
      AppErrorCode.VALIDATION_ERROR,
      `Input validation failed for casepack "${ctx.casepack_key}"`,
      { run_id: runId, report: inputReport }
    );
  }

  if (shouldTrace) {
    await traceWriter.step(runId, { phase: "input_validated" }, ctx.casepack_key);
  }

  // ── Step 4: Build execution plan ────────────────────────────────────────────
  const plan: ExecutionPlan = buildExecutionPlan(runId, mao, user_input);

  if (shouldTrace) {
    await traceWriter.step(runId, {
      phase:    "plan_built",
      provider: plan.provider,
      model:    plan.model,
    }, ctx.casepack_key);
  }

  // Save execution plan internally (FORBIDDEN — never sent to public response)
  await runStore.update(runId, {
    status: "running",
    execution_plan: {
      provider:            plan.provider,
      model:               plan.model,
      repair_enabled:      plan.repair_enabled,
      max_repair_attempts: plan.max_repair_attempts,
      prompt_length:       plan.prompt.length,
    },
  });

  // ── Step 5: Call AI provider ────────────────────────────────────────────────
  let rawText: string;
  let tokensIn = 0;
  let tokensOut = 0;

  try {
    const callResult = await adapter.call(plan.prompt, {
      model:          plan.model,
      temperature:    plan.temperature,
      max_tokens:     plan.max_tokens,
      timeout_ms:     plan.timeout_ms,
      _casepack_key:  ctx.casepack_key,
    });
    rawText    = callResult.raw_text;
    tokensIn   = callResult.tokens_in;
    tokensOut  = callResult.tokens_out;
  } catch (err) {
    const completedAt = new Date().toISOString();
    await runStore.update(runId, { status: "failed", completed_at: completedAt });
    if (shouldTrace) {
      await traceWriter.error(runId, {
        phase: "provider_call",
        error: err instanceof Error ? err.message : String(err),
      }, ctx.casepack_key);
    }
    throw new AppError(
      AppErrorCode.PROVIDER_ERROR,
      `AI provider call failed for casepack "${ctx.casepack_key}"`,
      { run_id: runId, error: err instanceof Error ? err.message : String(err) }
    );
  }

  // ── Step 6: Parse output ────────────────────────────────────────────────────
  let parsedOutput: Record<string, unknown>;
  try {
    parsedOutput = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    const completedAt = new Date().toISOString();
    await runStore.update(runId, { status: "failed", completed_at: completedAt });
    if (shouldTrace) {
      await traceWriter.error(runId, {
        phase:  "json_parse",
        error:  "AI returned invalid JSON",
      }, ctx.casepack_key);
    }
    throw new AppError(
      AppErrorCode.PROVIDER_ERROR,
      `AI returned invalid JSON for casepack "${ctx.casepack_key}"`,
      { run_id: runId }
    );
  }

  if (shouldTrace) {
    await traceWriter.output(runId, {
      phase:       "ai_output_received",
      output_keys: Object.keys(parsedOutput),
      tokens_in:   tokensIn,
      tokens_out:  tokensOut,
    }, ctx.casepack_key);
  }

  // ── Step 7: Validate output ─────────────────────────────────────────────────
  const outputReport = validateOutput(parsedOutput, mao.output_contract);

  // ── Step 8: Happy path — output is valid ────────────────────────────────────
  if (outputReport.valid) {
    return await finalizeRun(ctx, runId, "success", parsedOutput, outputReport, 0, false, tokensIn, tokensOut, shouldTrace, plan);
  }

  // ── Step 9: Repair loop ─────────────────────────────────────────────────────
  if (!plan.repair_enabled) {
    // Repair disabled — go straight to fallback
    const fallbackResult = handleFallback(mao.output_contract, parsedOutput, {
      repaired: false, output: parsedOutput, attempts: 0, reports: [outputReport],
      totalTokensIn: 0, totalTokensOut: 0,
    });
    return await finalizeRun(ctx, runId, "failed", fallbackResult.output, outputReport, 0, fallbackResult.fallback_used, tokensIn, tokensOut, shouldTrace, plan);
  }

  if (shouldTrace) {
    await traceWriter.repair(runId, {
      phase:          "repair_started",
      blocking_errors: outputReport.errors.filter((e) => e.blocking !== false).length,
    }, ctx.casepack_key);
  }

  const repairResult = await repairLoop(
    adapter,
    plan.prompt,
    {
      model:         plan.model,
      temperature:   plan.temperature,
      max_tokens:    plan.max_tokens,
      timeout_ms:    plan.timeout_ms,
      _casepack_key: ctx.casepack_key,
    },
    parsedOutput,
    outputReport,
    mao.output_contract,
    plan.max_repair_attempts
  );

  tokensIn  += repairResult.totalTokensIn;
  tokensOut += repairResult.totalTokensOut;

  // ── Step 10: Repair succeeded ───────────────────────────────────────────────
  if (repairResult.repaired) {
    const lastReport = repairResult.reports[repairResult.reports.length - 1];
    if (lastReport === undefined) {
      throw new AppError(AppErrorCode.INTERNAL_ERROR, "Repair returned no reports");
    }
    if (shouldTrace) {
      await traceWriter.step(runId, {
        phase:    "repair_succeeded",
        attempts: repairResult.attempts,
      }, ctx.casepack_key);
    }
    return await finalizeRun(ctx, runId, "repaired", repairResult.output, lastReport, repairResult.attempts, false, tokensIn, tokensOut, shouldTrace, plan);
  }

  // ── Step 11: Fallback ───────────────────────────────────────────────────────
  const fallbackResult = handleFallback(mao.output_contract, repairResult.output, repairResult);

  if (shouldTrace) {
    await traceWriter.fallback(runId, {
      phase:  "fallback_applied",
      reason: fallbackResult.reason,
    }, ctx.casepack_key);
  }

  const lastRepairReport = repairResult.reports[repairResult.reports.length - 1];
  const finalReport = lastRepairReport ?? outputReport;

  return await finalizeRun(ctx, runId, "failed", fallbackResult.output, finalReport, repairResult.attempts, fallbackResult.fallback_used, tokensIn, tokensOut, shouldTrace, plan);
}

// ── Finalize helper ───────────────────────────────────────────────────────────

async function finalizeRun(
  ctx: RunContext,
  runId: string,
  status: "success" | "failed" | "repaired",
  output: Record<string, unknown>,
  validation: ValidationReport,
  repairAttempts: number,
  fallbackUsed: boolean,
  tokensIn: number,
  tokensOut: number,
  shouldTrace: boolean,
  plan: ExecutionPlan
): Promise<RunResult> {
  const completedAt = new Date().toISOString();

  // ── Save output ───────────────────────────────────────────────────────────
  await ctx.runStore.update(runId, {
    status,
    output_json:     output,
    repair_attempts: repairAttempts,
    completed_at:    completedAt,
  });

  // ── Trace: complete or error ──────────────────────────────────────────────
  if (shouldTrace) {
    if (status === "failed") {
      await ctx.traceWriter.error(runId, {
        phase:           "run_complete",
        status,
        fallback_used:   fallbackUsed,
        repair_attempts: repairAttempts,
      }, ctx.casepack_key);
    } else {
      await ctx.traceWriter.complete(runId, {
        phase:           "run_complete",
        status,
        repair_attempts: repairAttempts,
      }, ctx.casepack_key);
    }
  }

  // ── Usage event ───────────────────────────────────────────────────────────
  if (shouldTrace) {
    await ctx.usageWriter.record({
      run_id:          runId,
      workspace_id:    ctx.workspace_id,
      casepack_key:    ctx.casepack_key,
      provider:        plan.provider,
      model:           plan.model,
      tokens_in:       tokensIn,
      tokens_out:      tokensOut,
      repair_attempts: repairAttempts,
    });
  }

  // ── Sanitize if public mode ───────────────────────────────────────────────
  const finalOutput = ctx.publicMode
    ? sanitizePublicOutput(output, ctx.mao.output_contract)
    : output;

  return {
    run_id:          runId,
    status,
    output:          finalOutput,
    validation,
    repair_attempts: repairAttempts,
    fallback_used:   fallbackUsed,
  };
}
