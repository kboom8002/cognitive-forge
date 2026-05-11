/**
 * @cognitive-forge/runtime
 *
 * CasePackRunner, AIProviderAdapter, repair/fallback logic,
 * trace event writer, and usage event writer.
 *
 * ISOLATION RULES (enforced at review):
 *   ✓ May import @cognitive-forge/core and @cognitive-forge/casepack
 *   ✓ May import @cognitive-forge/validation (FORBIDDEN_PUBLIC_KEYS only)
 *   ✗ Must NOT import React or Next.js
 *   ✗ Must NOT import @cognitive-forge/ui-forge
 *   ✗ Must NOT import apps/web
 *   ✗ Must NOT import Supabase client directly (uses injected DB adapter)
 */

export { CORE_VERSION }    from "@cognitive-forge/core";
export { CASEPACK_VERSION } from "@cognitive-forge/casepack";

/** Resolvability sentinel — import this to verify the package links correctly. */
export const RUNTIME_VERSION = "0.1.0" as const;

// ── AI Provider ───────────────────────────────────────────────────────────────
export type {
  AIProviderAdapter,
  ProviderCallConfig,
  ProviderCallResult,
} from "./ai/ai-provider";

export { MockAIProvider } from "./ai/mock-ai-provider";
export type { MockOutputMap } from "./ai/mock-ai-provider";

export { createProvider } from "./ai/provider-factory";
export type { ProviderName, ProviderFactoryOptions } from "./ai/provider-factory";

// ── Validators ────────────────────────────────────────────────────────────────
export { validateInput }  from "./validators/input-validator";
export { validateOutput } from "./validators/output-validator";

// ── Execution Plan ────────────────────────────────────────────────────────────
export { buildExecutionPlan } from "./plan/execution-plan-builder";
export type { ExecutionPlan }  from "./plan/execution-plan-builder";

// ── Repair ────────────────────────────────────────────────────────────────────
export { repairLoop } from "./repair/repair-loop";
export type { RepairResult } from "./repair/repair-loop";

export { handleFallback, FALLBACK_PLACEHOLDER } from "./repair/fallback-handler";
export type { FallbackResult } from "./repair/fallback-handler";

// ── Trace & Usage ─────────────────────────────────────────────────────────────
export { TraceWriter } from "./trace/trace-writer";
export type { TraceRecord, ITraceStore } from "./trace/trace-writer";
export { UsageWriter } from "./trace/usage-writer";
export type { UsageRecord, IUsageStore } from "./trace/usage-writer";
export { TraceSummaryBuilder } from "./trace/trace-summary-builder";
export type { PublicTraceSummary } from "./trace/trace-summary-builder";

// ── Retention ─────────────────────────────────────────────────────────────────
export { RETENTION_DAYS, isRetained, shouldPersist } from "./trace/retention-policy";

// ── Public Output Sanitizers ────────────────────────────────────────────────
export { sanitizePublicOutput } from "./public/public-output-sanitizer";
export { sanitizeGraphRunResult } from "./public/public-graph-run-sanitizer";
export type {
  PublicGraphRunResult,
  PublicGraphRunRecord,
} from "./public/public-graph-run-sanitizer";
export { sanitizeTrustSignals } from "./public/trust-sanitizer";
export type { PublicTrustSignalSummary, InternalTrustSignalPayload } from "./public/trust-sanitizer";

// ── Builder Inspection ────────────────────────────────────────────────────────
export { buildSafeBuilderSummary } from "./builder/builder-sanitizer";
export type { BuilderInspectionSummary } from "./builder/builder-sanitizer";

// ── Single CasePack Runner ────────────────────────────────────────────────────
export { runSingleCasePack } from "./runner/single-casepack-runner";
export type { RunContext, RunResult, IRunStore } from "./runner/single-casepack-runner";

// ── Graph Runner ──────────────────────────────────────────────────────────────
export { runSequentialGraph } from "./runner/sequential-graph-runner";
export type {
  GraphRunContext,
  GraphRunResult,
  NodeRunResult,
  IGraphRunStore,
} from "./runner/sequential-graph-runner";

// ── Fixtures (test/demo only) ─────────────────────────────────────────────────
export { MOCK_OUTPUT_MAP } from "./fixtures/index";
