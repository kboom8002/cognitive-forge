/**
 * Gallery v2.0 Project Brief & 2-Stage Matching Engine
 *
 * Implements D25_SERVICE_OFFERING_AND_PROJECT_MATCHING.md, GX05, and Acceptance Scenarios
 * GT09, GT10, GT11, GT12:
 * - Server-injected `workspace_id` on `ProjectBrief` creation (`POST /api/v1/projects`)
 * - Strict workspace isolation on `GET /api/v1/projects/{brief_id}/matches` (`403 FORBIDDEN` `GT11`)
 * - Stage 1 Hard Eligibility Filter (`deliverable_type`, `language`, `input_formats`, `review_required`):
 *   unmet hard constraints force `eligible: false` and populate `unmet_conditions` (`GT09`)
 * - Stage 2 Structured Reasons & Non-Binding Recommendation: matching never auto-accepts a contract;
 *   `needs_confirmation` explicitly states mutual acceptance requirements (`GT10`)
 */

import { createHash } from "crypto";
import {
  AppError,
  AppErrorCode,
  MatchCandidateSchema,
  ProjectBriefSchema,
  ProjectCreateSchema,
  type MatchCandidate,
  type ProjectBrief,
  type ProjectCreate,
} from "@cognitive-forge/core";
import type { GalleryV2Service } from "./gallery-service";

function hashBody(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body), "utf8").digest("hex");
}

export class MatchingV2Service {
  readonly briefs = new Map<string, ProjectBrief>();
  readonly computedMatches = new Map<string, MatchCandidate[]>();
  private readonly idempotencyRecords = new Map<
    string,
    { bodyHash: string; brief: ProjectBrief }
  >();

  constructor(private readonly galleryService: GalleryV2Service) {}

  /**
   * `POST /api/v1/projects` — Creates a `ProjectBrief` with server-injected `workspace_id` (`GT11`, `GT12`).
   */
  createProjectBrief(
    rawBody: ProjectCreate,
    options: {
      idempotencyKey: string;
      workspaceId: string;
      briefId?: string;
    }
  ): ProjectBrief {
    if (!options.idempotencyKey || options.idempotencyKey.trim().length === 0) {
      throw new AppError(AppErrorCode.VALIDATION_FAILED, "Idempotency-Key header is required");
    }
    if (!options.workspaceId || options.workspaceId.trim().length === 0) {
      throw new AppError(AppErrorCode.UNAUTHORIZED, "Authentication workspace is required");
    }

    const body = ProjectCreateSchema.parse(rawBody);
    const bodyHash = hashBody(body);
    const idemKey = `${options.workspaceId}:${options.idempotencyKey}`;

    const existingIdem = this.idempotencyRecords.get(idemKey);
    if (existingIdem) {
      if (existingIdem.bodyHash !== bodyHash) {
        throw new AppError(
          AppErrorCode.CONFLICT,
          `Idempotency-Key '${options.idempotencyKey}' was already used with a different project brief payload`
        );
      }
      return structuredClone(existingIdem.brief);
    }

    const briefId = options.briefId ?? `brief_${this.briefs.size + 1}`;
    const brief = ProjectBriefSchema.parse({
      brief_id: briefId,
      workspace_id: options.workspaceId,
      deliverable_type: body.deliverable_type,
      input_formats: body.input_formats,
      language: body.language,
      review_required: body.review_required,
      requirements: body.requirements,
      status: "submitted",
    });

    this.briefs.set(briefId, brief);

    // Precompute 2-stage matches
    const candidates = this.computeCandidatesForBrief(brief);
    this.computedMatches.set(briefId, candidates);

    this.idempotencyRecords.set(idemKey, {
      bodyHash,
      brief: structuredClone(brief),
    });

    return structuredClone(brief);
  }

  private computeCandidatesForBrief(brief: ProjectBrief): MatchCandidate[] {
    const results: MatchCandidate[] = [];
    const reqLang = (brief.language.split("-")[0] ?? brief.language).toLowerCase();

    for (const offering of this.galleryService.offerings.values()) {
      const reasons: string[] = [];
      const unmet: string[] = [];
      const needsConfirmation: string[] = [
        "최종 납기 및 세부 범위 크리에이터 상호 확인 필요",
        "추천 후보 상태이며 양측 명시 수락 전까지 계약이 성립되지 않음",
      ];

      // 1. Deliverable type check
      const primaryDeliverable = offering.deliverables[0] ?? "";
      const deliverableMatches =
        offering.deliverables.some(
          (d) =>
            d.toLowerCase() === brief.deliverable_type.toLowerCase() ||
            d.toLowerCase().includes(brief.deliverable_type.toLowerCase()) ||
            brief.deliverable_type.toLowerCase().includes(d.toLowerCase())
        );

      if (deliverableMatches) {
        reasons.push(`산출물 유형 일치 (${primaryDeliverable})`);
      } else {
        unmet.push(`산출물 유형 불일치 (요청: ${brief.deliverable_type}, 제공: ${primaryDeliverable})`);
      }

      // 2. Language support check (`GT09`)
      const listingLangs = this.galleryService.listingLanguages.get(offering.listing_id) ?? ["ko", "en"];
      const supportedLangs = listingLangs.map((l) => (l.split("-")[0] ?? l).toLowerCase());
      if (supportedLangs.includes(reqLang)) {
        reasons.push(`지원 언어 충족 (${brief.language})`);
      } else {
        unmet.push(`언어 미지원 (${brief.language})`);
      }

      // 3. Input formats check (`GT09`)
      const supportedFormats = new Set(offering.required_inputs.map((f) => f.toLowerCase()));
      const missingFormats = brief.input_formats.filter(
        (fmt) => !supportedFormats.has(fmt.toLowerCase())
      );
      if (missingFormats.length === 0) {
        reasons.push(`입력 형식 호환 (${brief.input_formats.join(", ")})`);
      } else {
        unmet.push(`미지원 입력 형식: ${missingFormats.join(", ")}`);
      }

      // 4. Human review requirement check (`GT09`)
      if (brief.review_required && !offering.human_review) {
        unmet.push("인간 전문가 검수 미포함 오퍼링");
      } else if (brief.review_required && offering.human_review) {
        reasons.push("전문가 검수 포함 오퍼링");
      }

      if (offering.price_status === "quote_required") {
        needsConfirmation.push("견적 산정(quote_required) 확인 필요");
      }

      const eligible = unmet.length === 0;
      if (!eligible && reasons.length === 0) {
        reasons.push("하드 적격성 조건 미충족");
      }

      results.push(
        MatchCandidateSchema.parse({
          brief_id: brief.brief_id,
          offering_id: offering.offering_id,
          eligible,
          reasons,
          unmet_conditions: unmet,
          needs_confirmation: needsConfirmation,
        })
      );
    }

    // Sort eligible candidates first, then by number of reasons
    results.sort((a, b) => {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      return b.reasons.length - a.reasons.length;
    });

    return results;
  }

  /**
   * `GET /api/v1/projects/{brief_id}/matches` — Returns match candidates with strict workspace guard (`GT09`, `GT10`, `GT11`).
   */
  getProjectMatches(
    briefId: string,
    actorWorkspaceId: string,
    options?: { includeIneligible?: boolean }
  ): {
    brief: ProjectBrief;
    items: MatchCandidate[];
    next_cursor: string | null;
  } {
    if (!actorWorkspaceId || actorWorkspaceId.trim().length === 0) {
      throw new AppError(AppErrorCode.UNAUTHORIZED, "Authentication workspace is required");
    }

    const brief = this.briefs.get(briefId);
    if (!brief) {
      throw new AppError(AppErrorCode.NOT_FOUND, `ProjectBrief '${briefId}' not found`);
    }

    // Strict workspace isolation (`GT11`)
    if (brief.workspace_id !== actorWorkspaceId) {
      throw new AppError(
        AppErrorCode.FORBIDDEN,
        `Workspace '${actorWorkspaceId}' is not authorized to view matches for ProjectBrief '${briefId}'`,
        { brief_id: briefId, owner_workspace_id: brief.workspace_id }
      );
    }

    // Recompute in case new offerings were registered dynamically
    const allCandidates = this.computeCandidatesForBrief(brief);
    this.computedMatches.set(briefId, allCandidates);

    const filtered = options?.includeIneligible
      ? allCandidates
      : allCandidates.filter((c) => c.eligible);

    return {
      brief: structuredClone(brief),
      items: structuredClone(filtered),
      next_cursor: null,
    };
  }
}
