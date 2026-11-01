/**
 * Gallery v2.0 Benchmark Lab & Side-by-Side A/B Comparison Service
 *
 * Implements D24_BENCHMARK_LAB_AND_AB_COMPARISON.md, GX04, and Acceptance Scenarios
 * GT07, GT08, GT12, GT13, GT14:
 * - Validates 2~3 unique `release_ids` (`ComparisonCreateSchema`)
 * - Computes explicit configuration diff (`is_pure_persona_comparison` vs `model_or_temperature_differs` `GT07`)
 * - Blocks `owner_private` data transmission without explicit recipient consent (`GT08`)
 * - Partial failure handling (`partial_failed`) + selective retry of only failed candidate runs
 *   without re-executing or double-billing completed runs (`GT13`)
 * - Release-pinned feedback & review aggregation (`GT14`)
 */

import { createHash } from "crypto";
import {
  AppError,
  AppErrorCode,
  ComparisonCreateSchema,
  ComparisonSessionSchema,
  type ComparisonCreate,
  type ComparisonSession,
} from "@cognitive-forge/core";
import type { GalleryV2Service } from "./gallery-service";

export interface CandidateRunDetail {
  run_id: string;
  release_id: string;
  status: "completed" | "failed";
  billed_units: number;
  execution_count: number;
  model_name: string;
  temperature: number;
  persona_role: string;
  output_summary: string | null;
  error_reason: string | null;
}

export interface ComparisonConfigDiff {
  is_pure_persona_comparison: boolean;
  model_differs: boolean;
  temperature_differs: boolean;
  diff_warnings: string[];
}

export interface ReleaseFeedbackEntry {
  feedback_id: string;
  release_id: string;
  pack_id: string;
  workspace_id: string;
  score: number;
  comment: string;
  created_at: string;
}

function hashBody(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body), "utf8").digest("hex");
}

export class ComparisonV2Service {
  readonly sessions = new Map<string, ComparisonSession>();
  readonly candidateRuns = new Map<string, CandidateRunDetail[]>();
  readonly configDiffs = new Map<string, ComparisonConfigDiff>();
  readonly releaseFeedback = new Map<string, ReleaseFeedbackEntry[]>();
  private readonly idempotencyRecords = new Map<
    string,
    { bodyHash: string; session: ComparisonSession }
  >();

  constructor(private readonly galleryService: GalleryV2Service) {}

  /**
   * `POST /api/v1/gallery/comparisons` — Creates a 2~3 release side-by-side comparison session (`GT07`, `GT08`, `GT13`).
   */
  createComparison(
    rawBody: ComparisonCreate,
    options: {
      idempotencyKey: string;
      workspaceId: string;
      comparisonId?: string;
      recipientConsent?: boolean;
      simulateFailedReleaseIds?: string[];
      customReleaseConfigs?: Record<
        string,
        { model_name?: string; temperature?: number; persona_role?: string }
      >;
    }
  ): ComparisonSession {
    if (!options.idempotencyKey || options.idempotencyKey.trim().length === 0) {
      throw new AppError(AppErrorCode.VALIDATION_FAILED, "Idempotency-Key header is required");
    }
    if (!options.workspaceId || options.workspaceId.trim().length === 0) {
      throw new AppError(AppErrorCode.UNAUTHORIZED, "Authentication workspace is required");
    }

    const body = ComparisonCreateSchema.parse(rawBody);
    const bodyHash = hashBody(body);
    const idemKey = `${options.workspaceId}:${options.idempotencyKey}`;

    const existingIdem = this.idempotencyRecords.get(idemKey);
    if (existingIdem) {
      if (existingIdem.bodyHash !== bodyHash) {
        throw new AppError(
          AppErrorCode.CONFLICT,
          `Idempotency-Key '${options.idempotencyKey}' was already used with a different comparison payload`
        );
      }
      return structuredClone(existingIdem.session);
    }

    // Check `owner_private` consent (`GT08`)
    if (body.data_scope === "owner_private" && options.recipientConsent !== true) {
      throw new AppError(
        AppErrorCode.FORBIDDEN,
        "owner_private comparison requires explicit recipient consent before transmitting private workspace documents",
        { data_scope: body.data_scope, release_ids: body.release_ids }
      );
    }

    const comparisonId = options.comparisonId ?? `cmp_${this.sessions.size + 1}`;
    const failedSet = new Set(options.simulateFailedReleaseIds ?? []);

    const runs: CandidateRunDetail[] = body.release_ids.map((relId, idx) => {
      const meta = this.galleryService.releaseMeta.get(relId);
      const custom = options.customReleaseConfigs?.[relId];
      const modelName = custom?.model_name ?? meta?.model_name ?? "gpt-4.1";
      const temperature = custom?.temperature ?? meta?.temperature ?? 0.2;
      const personaRole = custom?.persona_role ?? `Persona for ${relId}`;
      const shouldFail = failedSet.has(relId);

      return {
        run_id: `run_${comparisonId}_${idx + 1}`,
        release_id: relId,
        status: shouldFail ? "failed" : "completed",
        billed_units: shouldFail ? 0 : 1,
        execution_count: 1,
        model_name: modelName,
        temperature,
        persona_role: personaRole,
        output_summary: shouldFail
          ? null
          : `Benchmark '${body.task_id}' deliverable produced by ${relId}`,
        error_reason: shouldFail ? "Simulated candidate timeout/provider fault" : null,
      };
    });

    // Compute configuration diff (`GT07`)
    const uniqueModels = new Set(runs.map((r) => r.model_name));
    const uniqueTemps = new Set(runs.map((r) => r.temperature));
    const modelDiffers = uniqueModels.size > 1;
    const temperatureDiffers = uniqueTemps.size > 1;
    const diffWarnings: string[] = [];
    if (modelDiffers) {
      diffWarnings.push(
        `Model differs across candidates (${Array.from(uniqueModels).join(" vs ")})`
      );
    }
    if (temperatureDiffers) {
      diffWarnings.push(
        `Temperature differs across candidates (${Array.from(uniqueTemps).join(" vs ")})`
      );
    }

    this.configDiffs.set(comparisonId, {
      is_pure_persona_comparison: !modelDiffers && !temperatureDiffers,
      model_differs: modelDiffers,
      temperature_differs: temperatureDiffers,
      diff_warnings: diffWarnings,
    });

    const failedCount = runs.filter((r) => r.status === "failed").length;
    const sessionStatus: ComparisonSession["status"] =
      failedCount === 0 ? "completed" : "failed";

    const session = ComparisonSessionSchema.parse({
      comparison_id: comparisonId,
      workspace_id: options.workspaceId,
      task_id: body.task_id,
      release_ids: body.release_ids,
      status: sessionStatus,
      data_scope: body.data_scope,
      run_ids: runs.map((r) => r.run_id),
    });

    this.sessions.set(comparisonId, session);
    this.candidateRuns.set(comparisonId, runs);
    this.idempotencyRecords.set(idemKey, {
      bodyHash,
      session: structuredClone(session),
    });

    return structuredClone(session);
  }

  /**
   * `GET /api/v1/gallery/comparisons/{comparison_id}` — Returns `ComparisonSession`.
   */
  getComparison(comparisonId: string, actorWorkspaceId?: string): ComparisonSession {
    const session = this.sessions.get(comparisonId);
    if (!session) {
      throw new AppError(AppErrorCode.NOT_FOUND, `Comparison '${comparisonId}' not found`);
    }
    if (actorWorkspaceId && actorWorkspaceId !== session.workspace_id) {
      throw new AppError(
        AppErrorCode.FORBIDDEN,
        `Workspace '${actorWorkspaceId}' cannot access comparison '${comparisonId}'`
      );
    }
    return structuredClone(session);
  }

  getComparisonDetail(comparisonId: string, actorWorkspaceId?: string): {
    session: ComparisonSession;
    runs: CandidateRunDetail[];
    config_diff: ComparisonConfigDiff;
  } {
    const session = this.getComparison(comparisonId, actorWorkspaceId);
    const runs = this.candidateRuns.get(comparisonId) ?? [];
    const diff = this.configDiffs.get(comparisonId) ?? {
      is_pure_persona_comparison: true,
      model_differs: false,
      temperature_differs: false,
      diff_warnings: [],
    };
    return {
      session,
      runs: structuredClone(runs),
      config_diff: structuredClone(diff),
    };
  }

  /**
   * Retries ONLY failed candidate runs in a `partial_failed` comparison session (`GT13`).
   * Already completed runs are NOT re-executed and NOT double-billed.
   */
  retryFailedCandidateRuns(comparisonId: string): {
    session: ComparisonSession;
    runs: CandidateRunDetail[];
    retried_run_ids: string[];
  } {
    const session = this.sessions.get(comparisonId);
    if (!session) {
      throw new AppError(AppErrorCode.NOT_FOUND, `Comparison '${comparisonId}' not found`);
    }
    const runs = this.candidateRuns.get(comparisonId) ?? [];
    const retriedIds: string[] = [];

    for (const run of runs) {
      if (run.status === "failed") {
        run.status = "completed";
        run.execution_count += 1;
        run.billed_units = 1;
        run.output_summary = `Recovered benchmark '${session.task_id}' deliverable produced by ${run.release_id}`;
        run.error_reason = null;
        retriedIds.push(run.run_id);
      }
    }

    const updatedSession = ComparisonSessionSchema.parse({
      ...session,
      status: "completed",
    });
    this.sessions.set(comparisonId, updatedSession);

    return {
      session: structuredClone(updatedSession),
      runs: structuredClone(runs),
      retried_run_ids: retriedIds,
    };
  }

  /**
   * Records user feedback pinned to a specific `release_id` (`GT14`) so new release versions
   * keep historical release reviews separate.
   */
  recordReleaseFeedback(params: {
    release_id: string;
    pack_id: string;
    workspace_id: string;
    score: number;
    comment: string;
  }): ReleaseFeedbackEntry {
    const entry: ReleaseFeedbackEntry = {
      feedback_id: `fb_${params.release_id}_${Date.now()}`,
      release_id: params.release_id,
      pack_id: params.pack_id,
      workspace_id: params.workspace_id,
      score: params.score,
      comment: params.comment,
      created_at: new Date().toISOString(),
    };
    const list = this.releaseFeedback.get(params.release_id) ?? [];
    list.push(entry);
    this.releaseFeedback.set(params.release_id, list);
    return structuredClone(entry);
  }

  getReleaseFeedback(releaseId: string): ReleaseFeedbackEntry[] {
    return structuredClone(this.releaseFeedback.get(releaseId) ?? []);
  }
}
