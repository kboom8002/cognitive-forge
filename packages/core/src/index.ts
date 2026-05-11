/**
 * @cognitive-forge/core
 *
 * Shared types, Zod schemas, and platform constants.
 * This is the base package — it must stay framework-agnostic.
 *
 * ISOLATION RULES (enforced at review):
 *   ✗ Must NOT import React, Next.js, or Supabase
 *   ✗ Must NOT import any other @cognitive-forge/* package
 *   ✗ Must NOT import apps/web
 */

// ── Resolvability sentinel ───────────────────────────────────────────────────
/** Import this to verify @cognitive-forge/core resolves correctly. */
export const CORE_VERSION = "0.0.1" as const;

// ── Types ────────────────────────────────────────────────────────────────────
export type { JsonPrimitive, JsonValue, JsonObject, JsonArray } from "./types/json";
export { AppErrorCode, AppError } from "./types/error";

// ── Constants ────────────────────────────────────────────────────────────────
export {
  RUN_STATUS,
  PACK_STATUS,
  VISIBILITY_LEVEL,
  APP_TYPE,
  AI_PROVIDER,
} from "./constants/index";

export type {
  RunStatus,
  PackStatus,
  VisibilityLevel,
  AppType,
  AIProvider,
} from "./constants/index";

// ── Primitive Zod schemas ────────────────────────────────────────────────────
export {
  UUIDSchema,
  ISODateTimeSchema,
  SlugSchema,
  SemVerSchema,
  PackKeySchema,
  CasePackKeySchema,
  BridgeKeySchema,
  GraphKeySchema,
  JsonValueSchema,
  JsonObjectSchema,
  RunStatusSchema,
  PackStatusSchema,
  VisibilityLevelSchema,
  AppTypeSchema,
  AIProviderSchema,
} from "./schemas/primitives";

// ── Utilities ────────────────────────────────────────────────────────────────
export { safeParseOrThrow, safeParse } from "./utils/parse";

// ── Phase B schemas — leaf schemas ──────────────────────────────────────────

// Field definition (shared by Input and Output contracts)
export { FieldDefSchema, FIELD_TYPES } from "./schemas/fields";
export type { FieldDef, FieldType } from "./schemas/fields";

// TaskflowCX
export { TaskflowCXSchema } from "./schemas/taskflow-cx";
export type { TaskflowCX } from "./schemas/taskflow-cx";

// InputContract
export { InputContractSchema } from "./schemas/input-contract";
export type { InputContract } from "./schemas/input-contract";

// OutputContract
export { OutputContractSchema } from "./schemas/output-contract";
export type { OutputContract } from "./schemas/output-contract";

// RuntimeContract (discriminated union)
export {
  RuntimeContractSchema,
  SingleCasePackRuntimeSchema,
  BridgeCasePackRuntimeSchema,
  SequentialGraphRuntimeSchema,
} from "./schemas/runtime-contract";
export type {
  RuntimeContract,
  SingleCasePackRuntime,
  BridgeCasePackRuntime,
  SequentialGraphRuntime,
} from "./schemas/runtime-contract";

// UISchema
export { UISchemaSchema, APP_MODE, UI_LAYOUT, FieldOverrideSchema } from "./schemas/ui-schema";
export type { UISchema, AppMode, FieldOverride } from "./schemas/ui-schema";

// ── Phase C schemas — composite schemas ────────────────────────────────────

// HandoffContract
export { HandoffContractSchema } from "./schemas/handoff-contract";
export type { HandoffContract } from "./schemas/handoff-contract";

// CasePackMAO
export { CasePackMAOSchema } from "./schemas/casepack-mao";
export type { CasePackMAO } from "./schemas/casepack-mao";

// BridgeCasePack
export { BridgeCasePackSchema } from "./schemas/bridge-casepack";
export type { BridgeCasePack } from "./schemas/bridge-casepack";

// CasePackGraph
export {
  CasePackGraphSchema,
  GraphNodeSchema,
  GraphEdgeSchema,
} from "./schemas/casepack-graph";
export type {
  CasePackGraph,
  GraphNode,
  GraphEdge,
} from "./schemas/casepack-graph";

// DomainPackManifest
export { DomainPackManifestSchema } from "./schemas/domain-pack-manifest";
export type { DomainPackManifest } from "./schemas/domain-pack-manifest";

// AppObject
export { AppObjectSchema } from "./schemas/app-object";
export type { AppObject } from "./schemas/app-object";

// ValidationReport
export {
  ValidationReportSchema,
  ValidationErrorSchema,
} from "./schemas/validation-report";
export type {
  ValidationReport,
  ValidationError,
} from "./schemas/validation-report";

// RuntimeTraceEvent
export {
  RuntimeTraceEventSchema,
  TRACE_EVENT_TYPE,
} from "./schemas/runtime-trace-event";
export type {
  RuntimeTraceEvent,
  TraceEventType,
} from "./schemas/runtime-trace-event";

// UsageEvent
export { UsageEventSchema } from "./schemas/usage-event";
export type { UsageEvent } from "./schemas/usage-event";
