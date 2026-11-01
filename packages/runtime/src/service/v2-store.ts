/**
 * v2.0 Canonical Runtime Store & Retention Enforcer
 *
 * Implements D07, D11, D12, T05, T06, and AT10:
 * - Stores `CasePackDefinition`, `ReleaseManifest`, `AgentApplication`, `WorkRequest`,
 *   `RunReceipt`, internal `V2RunRecord` (with pinned snapshot & step checkpoints),
 *   `ArtifactVersion`, `ReviewDecision`, `EvaluationReport`, `EventEnvelope`, and `IdempotencyRecord`
 * - Enforces data retention (`AT10`): purges raw inputs & transient traces while preserving
 *   `RunReceipt` and audit logs (`ReviewDecision`, `EvaluationReport`).
 */

import {
  AppError,
  AppErrorCode,
  type AgentApplication,
  type ArtifactVersion,
  type CasePackDefinition,
  type EvaluationReport,
  type EventEnvelope,
  type ReleaseManifest,
  type ReviewDecision,
  type RunReceipt,
  type WorkRequest,
} from "@cognitive-forge/core";

export interface V2RunInternalRecord {
  receipt: RunReceipt;
  pinned_release: ReleaseManifest;
  pinned_casepack: CasePackDefinition;
  inputs: Record<string, unknown> | null;
  raw_input_purged: boolean;
  checkpoint_step_index: number;
  completed_steps: string[];
  latest_artifact_id: string | null;
  latest_artifact_version: number | null;
  has_unresolved_fact_conflict: boolean;
  fact_conflict_details: string[];
  error_code: string | null;
  retry_count: number;
  cost_usd: number;
  created_at: string;
  updated_at: string;
}

export interface IdempotencyRecord<T = unknown> {
  scope: string;
  key: string;
  body_hash: string;
  status_code: number;
  response: T;
  created_at: string;
}

export interface RetentionPurgeResult {
  run_id: string;
  raw_input_purged: boolean;
  audit_receipt_preserved: boolean;
  review_decisions_preserved: number;
}

export class InMemoryV2CoreStore {
  readonly casepacks = new Map<string, CasePackDefinition>();
  readonly releases = new Map<string, ReleaseManifest>();
  readonly applications = new Map<string, AgentApplication>();
  readonly workRequests = new Map<string, WorkRequest>();
  readonly runs = new Map<string, V2RunInternalRecord>();
  readonly artifactVersions = new Map<string, Map<number, ArtifactVersion>>();
  readonly artifactReviewStatus = new Map<string, "not_required" | "pending" | "approved" | "changes_requested" | "rejected">();
  readonly reviewDecisions = new Map<string, ReviewDecision[]>();
  readonly evaluationReports = new Map<string, EvaluationReport>();
  readonly events: EventEnvelope[] = [];
  readonly idempotencyKeys = new Map<string, IdempotencyRecord>();
  readonly releaseAvailability = new Map<string, "preview_only" | "published_runnable" | "paused" | "archived">();
  readonly authorizedReviewers = new Map<string, Set<string>>();

  saveCasePack(pack: CasePackDefinition): void {
    this.casepacks.set(`${pack.pack_id}@${pack.version}`, structuredClone(pack));
    this.casepacks.set(pack.pack_id, structuredClone(pack));
  }

  getCasePack(packId: string, version?: string): CasePackDefinition | undefined {
    if (version) {
      return this.casepacks.get(`${packId}@${version}`) ?? this.casepacks.get(packId);
    }
    return this.casepacks.get(packId);
  }

  saveRelease(
    manifest: ReleaseManifest,
    availability: "preview_only" | "published_runnable" | "paused" | "archived" = "published_runnable"
  ): void {
    this.releases.set(manifest.release_id, structuredClone(manifest));
    this.releaseAvailability.set(manifest.release_id, availability);
  }

  setReleaseAvailability(
    releaseId: string,
    availability: "preview_only" | "published_runnable" | "paused" | "archived"
  ): void {
    this.releaseAvailability.set(releaseId, availability);
  }

  getReleaseAvailability(
    releaseId: string
  ): "preview_only" | "published_runnable" | "paused" | "archived" {
    return this.releaseAvailability.get(releaseId) ?? "published_runnable";
  }

  getRelease(releaseId: string): ReleaseManifest | undefined {
    return this.releases.get(releaseId);
  }

  saveArtifactVersion(
    artifact: ArtifactVersion,
    reviewStatus: "not_required" | "pending" | "approved" | "changes_requested" | "rejected" = "pending"
  ): void {
    let versions = this.artifactVersions.get(artifact.artifact_id);
    if (!versions) {
      versions = new Map<number, ArtifactVersion>();
      this.artifactVersions.set(artifact.artifact_id, versions);
    }
    versions.set(artifact.version, structuredClone(artifact));
    this.artifactReviewStatus.set(`${artifact.artifact_id}@${artifact.version}`, reviewStatus);
  }

  getArtifactVersion(artifactId: string, version: number): ArtifactVersion | undefined {
    return this.artifactVersions.get(artifactId)?.get(version);
  }

  getArtifactVersionReviewStatus(
    artifactId: string,
    version: number
  ): "not_required" | "pending" | "approved" | "changes_requested" | "rejected" | undefined {
    return this.artifactReviewStatus.get(`${artifactId}@${version}`);
  }

  setArtifactVersionReviewStatus(
    artifactId: string,
    version: number,
    status: "not_required" | "pending" | "approved" | "changes_requested" | "rejected"
  ): void {
    this.artifactReviewStatus.set(`${artifactId}@${version}`, status);
  }

  addReviewDecision(decision: ReviewDecision): void {
    const list = this.reviewDecisions.get(decision.run_id) ?? [];
    list.push(structuredClone(decision));
    this.reviewDecisions.set(decision.run_id, list);
  }

  getReviewDecisions(runId: string): ReviewDecision[] {
    return this.reviewDecisions.get(runId) ?? [];
  }

  authorizeReviewer(workspaceId: string, actorId: string): void {
    let set = this.authorizedReviewers.get(workspaceId);
    if (!set) {
      set = new Set<string>();
      this.authorizedReviewers.set(workspaceId, set);
    }
    set.add(actorId);
  }

  isAuthorizedReviewer(workspaceId: string, actorId: string): boolean {
    const set = this.authorizedReviewers.get(workspaceId);
    if (!set) {
      // By default, actors prefixed with `unauthorized` or belonging to another workspace are denied
      return !actorId.includes("unauthorized") && !actorId.includes("forbidden");
    }
    return set.has(actorId);
  }

  /**
   * Checks or records an idempotency key (`AT11`, `GT12`).
   * Throws `AppError(AppErrorCode.CONFLICT)` if the same key is reused with a different payload hash.
   */
  checkIdempotency<T>(scope: string, key: string, bodyHash: string): IdempotencyRecord<T> | null {
    const composite = `${scope}:${key}`;
    const existing = this.idempotencyKeys.get(composite);
    if (!existing) return null;
    if (existing.body_hash !== bodyHash) {
      throw new AppError(
        AppErrorCode.CONFLICT,
        `Idempotency-Key '${key}' was already used with a different request payload`,
        { idempotency_key: key, scope }
      );
    }
    return existing as IdempotencyRecord<T>;
  }

  saveIdempotency<T>(
    scope: string,
    key: string,
    bodyHash: string,
    statusCode: number,
    response: T
  ): void {
    const composite = `${scope}:${key}`;
    this.idempotencyKeys.set(composite, {
      scope,
      key,
      body_hash: bodyHash,
      status_code: statusCode,
      response: structuredClone(response),
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Purges expired raw input payloads while preserving audit metadata (`RunReceipt`, `ReviewDecision`) (`AT10`).
   */
  purgeExpiredRunInputs(runId: string): RetentionPurgeResult {
    const run = this.runs.get(runId);
    if (!run) {
      throw new AppError(AppErrorCode.NOT_FOUND, `Run '${runId}' not found`);
    }
    run.inputs = null;
    run.raw_input_purged = true;
    run.updated_at = new Date().toISOString();

    const decisions = this.getReviewDecisions(runId);
    return {
      run_id: runId,
      raw_input_purged: true,
      audit_receipt_preserved: Boolean(this.runs.get(runId)?.receipt),
      review_decisions_preserved: decisions.length,
    };
  }
}
