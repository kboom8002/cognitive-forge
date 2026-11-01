/**
 * v2-canonical.ts — Canonical Zod schemas for Cognitive Forge OS v2.0 (D06, D13).
 *
 * Strictly mirrors docs/Cognitive_Forge_OS_Gallery_Repo_Docs_v2_0/schemas/*.schema.json
 * and contracts/openapi.json with 100% field, type, enum, and strictness equivalence.
 */

import { z } from "zod";

const NonEmptyString = z.string().min(1);
const PositiveInt = z.number().int().min(1);
const PlainObject = z.record(z.unknown());

// ── 1. AgentApplication ───────────────────────────────────────────────────────

export const AgentApplicationSchema = z
  .object({
    app_id:       NonEmptyString,
    workspace_id: NonEmptyString,
    release_id:   NonEmptyString,
    slug:         NonEmptyString,
    settings:     PlainObject,
  })
  .strict();

export type AgentApplication = z.infer<typeof AgentApplicationSchema>;

// ── 2. ArtifactVersion ────────────────────────────────────────────────────────

export const ArtifactVersionSchema = z
  .object({
    artifact_id:  NonEmptyString,
    workspace_id: NonEmptyString,
    run_id:       NonEmptyString,
    version:      PositiveInt,
    content_hash: NonEmptyString,
    content:      PlainObject,
    evidence:     z.array(PlainObject),
  })
  .strict();

export type ArtifactVersion = z.infer<typeof ArtifactVersionSchema>;

// ── 3. CasePackDefinition ─────────────────────────────────────────────────────

export const CasePackDefinitionSchema = z
  .object({
    pack_id:          NonEmptyString,
    version:          NonEmptyString,
    task:             NonEmptyString,
    input_schema:     PlainObject,
    output_schema:    PlainObject,
    steps:            z.array(PlainObject),
    evaluation_rules: z.array(PlainObject),
  })
  .strict();

export type CasePackDefinition = z.infer<typeof CasePackDefinitionSchema>;

// ── 4. EvaluationReport ───────────────────────────────────────────────────────

export const EvaluationStatusEnum = z.enum(["not_run", "pass", "fail", "error"]);
export type EvaluationStatus = z.infer<typeof EvaluationStatusEnum>;

export const EvaluationReportSchema = z
  .object({
    report_id:     NonEmptyString,
    run_id:        NonEmptyString,
    suite_version: NonEmptyString,
    status:        EvaluationStatusEnum,
    checks:        z.array(PlainObject),
  })
  .strict();

export type EvaluationReport = z.infer<typeof EvaluationReportSchema>;

// ── 5. EventEnvelope ──────────────────────────────────────────────────────────

export const V2_EVENT_TYPES = [
  "run.started",
  "run.input_required",
  "review.requested",
  "run.completed",
  "run.failed",
  "run.cancelled",
  "artifact.ready",
] as const;

export const EventEnvelopeSchema = z
  .object({
    event_id:       NonEmptyString,
    event_type:     NonEmptyString,
    schema_version: NonEmptyString,
    occurred_at:    NonEmptyString,
    workspace_id:   NonEmptyString,
    run_id:         NonEmptyString,
    correlation_id: NonEmptyString,
    payload:        PlainObject,
  })
  .strict();

export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

// ── 6. ReleaseManifest ────────────────────────────────────────────────────────

export const ReleaseManifestSchema = z
  .object({
    release_id:               NonEmptyString,
    pack_id:                  NonEmptyString,
    pack_version:             NonEmptyString,
    compiler_version:         NonEmptyString,
    evaluation_suite_version: NonEmptyString,
    content_hash:             NonEmptyString,
  })
  .strict();

export type ReleaseManifest = z.infer<typeof ReleaseManifestSchema>;

// ── 7. ReviewDecision ─────────────────────────────────────────────────────────

export const ReviewDecisionActionEnum = z.enum(["approve", "request_changes", "reject"]);
export type ReviewDecisionAction = z.infer<typeof ReviewDecisionActionEnum>;

export const ReviewDecisionSchema = z
  .object({
    decision_id:       NonEmptyString,
    workspace_id:      NonEmptyString,
    run_id:            NonEmptyString,
    actor_id:          NonEmptyString,
    artifact_id:       NonEmptyString,
    artifact_version:  PositiveInt,
    content_hash:      NonEmptyString,
    decision:          ReviewDecisionActionEnum,
    expected_revision: PositiveInt,
  })
  .strict();

export type ReviewDecision = z.infer<typeof ReviewDecisionSchema>;

// ── 8. RunReceipt ─────────────────────────────────────────────────────────────

export const V2RunStatusEnum = z.enum([
  "queued",
  "running",
  "waiting_input",
  "waiting_review",
  "completed",
  "failed",
  "cancelled",
]);
export type V2RunStatus = z.infer<typeof V2RunStatusEnum>;

export const ReviewStatusEnum = z.enum([
  "not_required",
  "pending",
  "approved",
  "changes_requested",
]);
export type ReviewStatus = z.infer<typeof ReviewStatusEnum>;

export const RunReceiptSchema = z
  .object({
    run_id:            NonEmptyString,
    workspace_id:      NonEmptyString,
    release_id:        NonEmptyString,
    revision:          PositiveInt,
    status:            V2RunStatusEnum,
    artifact_ids:      z.array(z.string()),
    evaluation_status: EvaluationStatusEnum,
    review_status:     ReviewStatusEnum,
  })
  .strict();

export type RunReceipt = z.infer<typeof RunReceiptSchema>;

// ── 9. WorkRequest ────────────────────────────────────────────────────────────

export const WorkRequestSchema = z
  .object({
    request_id:         NonEmptyString,
    workspace_id:       NonEmptyString,
    app_id:             NonEmptyString,
    input:              PlainObject,
    external_reference: NonEmptyString,
  })
  .strict();

export type WorkRequest = z.infer<typeof WorkRequestSchema>;

// ── 10. OpenAPI v1 Request & Error Schemas ────────────────────────────────────

export const ReviewAuthorityEnum = z.enum(["native", "delegated"]);
export type ReviewAuthority = z.infer<typeof ReviewAuthorityEnum>;

export const RunCreateSchema = z
  .object({
    app_id:             NonEmptyString,
    release_id:         NonEmptyString,
    input:              PlainObject,
    external_reference: NonEmptyString.optional(),
    review_authority:   ReviewAuthorityEnum,
  })
  .strict();

export type RunCreate = z.infer<typeof RunCreateSchema>;

export const InputSubmitSchema = z
  .object({
    expected_revision: PositiveInt,
    input:             PlainObject,
  })
  .strict();

export type InputSubmit = z.infer<typeof InputSubmitSchema>;

export const CancelRequestSchema = z
  .object({
    expected_revision: PositiveInt,
    reason:            NonEmptyString,
  })
  .strict();

export type CancelRequest = z.infer<typeof CancelRequestSchema>;

export const V1ErrorSchema = z
  .object({
    code:       NonEmptyString,
    message:    NonEmptyString,
    request_id: NonEmptyString,
    retryable:  z.boolean().optional(),
  })
  .strict();

export type V1Error = z.infer<typeof V1ErrorSchema>;

export interface CitationRef {
  source_id: string;
  locator: string;
  quote_hash: string;
  [key: string]: unknown;
}

export const V2_CORE_SCHEMAS = {
  AgentApplication: AgentApplicationSchema,
  ArtifactVersion: ArtifactVersionSchema,
  CasePackDefinition: CasePackDefinitionSchema,
  EvaluationReport: EvaluationReportSchema,
  EventEnvelope: EventEnvelopeSchema,
  ReleaseManifest: ReleaseManifestSchema,
  ReviewDecision: ReviewDecisionSchema,
  RunReceipt: RunReceiptSchema,
  WorkRequest: WorkRequestSchema,
} as const;

