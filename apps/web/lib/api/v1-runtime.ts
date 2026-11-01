/**
 * Shared v2.0 Runtime & Gallery Singleton + OpenAPI v1 Auth/Error Helpers
 *
 * Wires `V2RunService`, `GalleryV2Service`, `ForkV2Service`, `ComparisonV2Service`,
 * and `MatchingV2Service` for `/api/v1/*`, `/studio/*`, `/gallery/*`, `/compare/*`,
 * `/creators/*`, and `/projects/*`.
 */

import { ZodError } from "zod";
import {
  AppError,
  AppErrorCode,
  ReleaseManifestSchema,
  V1ErrorSchema,
} from "@cognitive-forge/core";
import { adaptPilotPackToCanonical } from "@cognitive-forge/casepack";
import { InMemoryV2CoreStore, V2RunService } from "@cognitive-forge/runtime";
import {
  ComparisonV2Service,
  ForkV2Service,
  GalleryV2Service,
  MatchingV2Service,
} from "@cognitive-forge/domain-packs";

export interface V1PlatformContext {
  coreStore: InMemoryV2CoreStore;
  runService: V2RunService;
  galleryService: GalleryV2Service;
  forkService: ForkV2Service;
  comparisonService: ComparisonV2Service;
  matchingService: MatchingV2Service;
}

const globalForV1 = globalThis as unknown as {
  __forgeV1Context?: V1PlatformContext;
};

export function createFreshV1Context(): V1PlatformContext {
  const coreStore = new InMemoryV2CoreStore();
  const runService = new V2RunService(coreStore);
  const galleryService = new GalleryV2Service();
  const forkService = new ForkV2Service(galleryService);
  const comparisonService = new ComparisonV2Service(galleryService);
  const matchingService = new MatchingV2Service(galleryService);

  // Register all 12 PilotPacks as compiled CasePackDefinitions & ReleaseManifests in coreStore
  for (const [agentId, pilot] of galleryService.pilotPacks.entries()) {
    const { casepack } = adaptPilotPackToCanonical(pilot);
    coreStore.saveCasePack(casepack);
    const releaseId = `rel_${agentId.toLowerCase()}_v2`;
    const manifest = ReleaseManifestSchema.parse({
      release_id: releaseId,
      pack_id: casepack.pack_id,
      pack_version: casepack.version,
      compiler_version: "2.0.0",
      evaluation_suite_version: "2026.03",
      content_hash: `sha256:${agentId.toLowerCase()}_v2_verified_hash`,
    });
    coreStore.saveRelease(manifest, "published_runnable");
  }

  // Register preview_only entries so any direct attempt to execute them via `/api/v1/runs` fails (`GT01`)
  for (const entry of galleryService.catalogEntries.values()) {
    if (!galleryService.pilotPacks.has(entry.agent_id)) {
      const previewRelId = `rel_${entry.agent_id.toLowerCase()}_preview`;
      coreStore.setReleaseAvailability(previewRelId, "preview_only");
    }
  }

  return {
    coreStore,
    runService,
    galleryService,
    forkService,
    comparisonService,
    matchingService,
  };
}

export function getV1Context(): V1PlatformContext {
  if (!globalForV1.__forgeV1Context) {
    globalForV1.__forgeV1Context = createFreshV1Context();
  }
  return globalForV1.__forgeV1Context;
}

export function resetV1Context(): V1PlatformContext {
  globalForV1.__forgeV1Context = createFreshV1Context();
  return globalForV1.__forgeV1Context;
}

export interface V1AuthInfo {
  workspaceId: string;
  actorId: string;
  token: string | null;
}

/**
 * Extracts caller authentication and workspace identity from `Request`.
 */
export function extractV1Auth(
  req: Request,
  options?: { requireBearer?: boolean }
): V1AuthInfo {
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
  const hasBearer = Boolean(authHeader && authHeader.toLowerCase().startsWith("bearer "));
  const token = hasBearer ? authHeader!.slice(7).trim() : null;

  if (options?.requireBearer && (!token || token.length === 0)) {
    throw new AppError(
      AppErrorCode.UNAUTHORIZED,
      "Missing or invalid Bearer token in Authorization header"
    );
  }

  const explicitWorkspace =
    req.headers.get("x-workspace-id") ??
    req.headers.get("X-Workspace-Id") ??
    (token && token.startsWith("ws_") ? token : null) ??
    "ws_default";

  const explicitActor =
    req.headers.get("x-actor-id") ??
    req.headers.get("X-Actor-Id") ??
    (token && token.startsWith("usr_") ? token : null) ??
    "usr_default";

  return {
    workspaceId: explicitWorkspace,
    actorId: explicitActor,
    token,
  };
}

/**
 * Converts any thrown error into a canonical `/api/v1/*` JSON response conforming to `V1ErrorSchema`.
 */
export function toV1ErrorResponse(err: unknown, requestId = `req_${Date.now()}`): Response {
  if (err instanceof ZodError) {
    const message = err.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
    const payload = V1ErrorSchema.parse({
      code: AppErrorCode.VALIDATION_FAILED,
      message: message || "Request validation failed",
      request_id: requestId,
      retryable: false,
    });
    return Response.json(payload, { status: 400 });
  }

  if (err instanceof AppError) {
    let status = 500;
    let retryable = false;
    switch (err.code) {
      case AppErrorCode.VALIDATION_FAILED:
      case AppErrorCode.VALIDATION_ERROR:
      case AppErrorCode.SCHEMA_VIOLATION:
      case AppErrorCode.CONTRACT_VIOLATION:
        status = 400;
        break;
      case AppErrorCode.UNAUTHORIZED:
        status = 401;
        break;
      case AppErrorCode.FORBIDDEN:
        status = 403;
        break;
      case AppErrorCode.NOT_FOUND:
        status = 404;
        break;
      case AppErrorCode.CONFLICT:
        status = 409;
        break;
      case AppErrorCode.UNPROCESSABLE_ENTITY:
        status = 422;
        break;
      case AppErrorCode.RATE_LIMITED:
        status = 429;
        retryable = true;
        break;
      case AppErrorCode.TIMEOUT:
      case AppErrorCode.PROVIDER_HTTP_ERROR:
        status = 502;
        retryable = true;
        break;
      default:
        status = 500;
        break;
    }

    const payload = V1ErrorSchema.parse({
      code: err.code,
      message: err.message,
      request_id: requestId,
      retryable,
    });
    return Response.json(payload, { status });
  }

  const fallbackMessage = err instanceof Error ? err.message : "Internal server error";
  const payload = V1ErrorSchema.parse({
    code: AppErrorCode.INTERNAL_ERROR,
    message: fallbackMessage,
    request_id: requestId,
    retryable: false,
  });
  return Response.json(payload, { status: 500 });
}
