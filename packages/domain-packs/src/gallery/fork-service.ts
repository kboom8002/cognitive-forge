/**
 * Gallery v2.0 Fork & Lineage Engine
 *
 * Implements D22_PERSONA_PACK_AND_FORK_ENGINE.md, GX03, and Acceptance Scenarios
 * GT03, GT04, GT05, GT12:
 * - Enforces parent release `fork_policy` (`prohibited` -> `403 FORBIDDEN` `GT03`)
 * - Guarantees `copied_customer_data === false` (excludes customer docs, run logs, secrets `GT04`)
 * - Guarantees `inherited_verified_badge === false` and resets child evaluation to `not_run` (`GT05`)
 * - Enforces `Idempotency-Key` (`GT12`: same key + same body -> returns existing `ForkLineage`;
 *   same key + different body -> `409 CONFLICT`)
 */

import { createHash } from "crypto";
import {
  AppError,
  AppErrorCode,
  ForkCreateSchema,
  ForkLineageSchema,
  type EvaluationStatus,
  type ForkCreate,
  type ForkLineage,
} from "@cognitive-forge/core";
import type { GalleryV2Service } from "./gallery-service";

export interface ForkedChildDraftPack {
  child_pack_id: string;
  parent_release_id: string;
  owner_workspace_id: string;
  display_name: string;
  visibility: "private";
  status: "draft";
  evaluation_status: EvaluationStatus;
  verified_badge: false;
  copied_customer_data: false;
  copied_secrets: false;
  copied_run_logs: false;
  created_at: string;
}

function hashBody(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body), "utf8").digest("hex");
}

export class ForkV2Service {
  readonly forks = new Map<string, ForkLineage>();
  readonly childDraftPacks = new Map<string, ForkedChildDraftPack>();
  private readonly idempotencyRecords = new Map<
    string,
    { bodyHash: string; lineage: ForkLineage }
  >();

  constructor(private readonly galleryService: GalleryV2Service) {}

  /**
   * `POST /api/v1/gallery/forks` — Creates a private draft fork + `ForkLineage` (`GT03`, `GT04`, `GT05`, `GT12`).
   */
  createFork(
    rawBody: ForkCreate,
    options: {
      idempotencyKey: string;
      ownerWorkspaceId: string;
      forkId?: string;
    }
  ): ForkLineage {
    if (!options.idempotencyKey || options.idempotencyKey.trim().length === 0) {
      throw new AppError(AppErrorCode.VALIDATION_FAILED, "Idempotency-Key header is required");
    }
    if (!options.ownerWorkspaceId || options.ownerWorkspaceId.trim().length === 0) {
      throw new AppError(AppErrorCode.UNAUTHORIZED, "Authentication workspace is required");
    }

    const body = ForkCreateSchema.parse(rawBody);
    const bodyHash = hashBody(body);
    const idemScopeKey = `${options.ownerWorkspaceId}:${options.idempotencyKey}`;

    const existingIdem = this.idempotencyRecords.get(idemScopeKey);
    if (existingIdem) {
      if (existingIdem.bodyHash !== bodyHash) {
        throw new AppError(
          AppErrorCode.CONFLICT,
          `Idempotency-Key '${options.idempotencyKey}' was already used with a different fork payload`,
          { idempotency_key: options.idempotencyKey }
        );
      }
      return structuredClone(existingIdem.lineage);
    }

    // Check parent release fork policy (`GT03`)
    const parentMeta = this.galleryService.releaseMeta.get(body.parent_release_id);
    if (parentMeta && parentMeta.fork_policy === "prohibited") {
      throw new AppError(
        AppErrorCode.FORBIDDEN,
        `Parent release '${body.parent_release_id}' has fork_policy='prohibited' and cannot be forked`,
        { parent_release_id: body.parent_release_id, fork_policy: "prohibited" }
      );
    }

    const index = this.forks.size + 1;
    const forkId = options.forkId ?? `fork_${index}`;
    const childPackId = `pack_fork_${index}_${body.parent_release_id.replace(/[^a-zA-Z0-9_]/g, "")}`;
    const creatorName = parentMeta
      ? this.galleryService.creators.get(parentMeta.creator_id)?.display_name ?? parentMeta.creator_id
      : "Original Creator";

    const lineage = ForkLineageSchema.parse({
      fork_id: forkId,
      parent_release_id: body.parent_release_id,
      child_pack_id: childPackId,
      owner_workspace_id: options.ownerWorkspaceId,
      license_version: body.license_version,
      attribution: `Forked from ${body.parent_release_id} (${creatorName}) — "${body.display_name}"`,
      copied_customer_data: false,
      inherited_verified_badge: false,
    });

    const childDraft: ForkedChildDraftPack = {
      child_pack_id: childPackId,
      parent_release_id: body.parent_release_id,
      owner_workspace_id: options.ownerWorkspaceId,
      display_name: body.display_name,
      visibility: "private",
      status: "draft",
      evaluation_status: "not_run",
      verified_badge: false,
      copied_customer_data: false,
      copied_secrets: false,
      copied_run_logs: false,
      created_at: new Date().toISOString(),
    };

    this.forks.set(forkId, lineage);
    this.childDraftPacks.set(childPackId, childDraft);
    this.idempotencyRecords.set(idemScopeKey, {
      bodyHash,
      lineage: structuredClone(lineage),
    });

    return structuredClone(lineage);
  }

  getChildDraftPack(childPackId: string): ForkedChildDraftPack | undefined {
    return this.childDraftPacks.get(childPackId);
  }

  listForksByWorkspace(workspaceId: string): ForkLineage[] {
    return Array.from(this.forks.values())
      .filter((f) => f.owner_workspace_id === workspaceId)
      .map((f) => structuredClone(f));
  }
}
