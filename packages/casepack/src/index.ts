/**
 * @cognitive-forge/casepack
 *
 * CasePack-MAO definition, versioning, and registry logic.
 *
 * ISOLATION RULES:
 *   ✓ May import @cognitive-forge/core
 *   ✗ Must NOT import React, Next.js, or Supabase
 *   ✗ Must NOT import @cognitive-forge/runtime, bridge, ui-forge
 *   ✗ Must NOT import apps/web
 */

export { CORE_VERSION } from "@cognitive-forge/core";

export const CASEPACK_VERSION = "0.0.1" as const;

// ── DB types ─────────────────────────────────────────────────────────────────
export type {
  CasePackRow,
  CasePackVersionRow,
  CasePackStatus,
  VisibilityLevel,
  CreateCasePackInput,
  CreateCasePackVersionInput,
  ListCasePacksOpts,
} from "./types/db";

// ── Repository ────────────────────────────────────────────────────────────────
export type { ICasePackStore } from "./repository/casepack.repo";
export { CasePackRepository } from "./repository/casepack.repo";

// ── Service ───────────────────────────────────────────────────────────────────
export { CasePackService } from "./service/casepack.service";
export type { CreateCasePackParams, CreateVersionParams } from "./service/casepack.service";

// ── Graph + App DB types ──────────────────────────────────────────────────────
export type {
  GraphRow,
  GraphVersionRow,
  GraphStatus,
  CreateGraphInput,
  CreateGraphVersionInput,
  ListGraphsOpts,
  AppRow,
  AppType,
  AppVisibility,
  CreateAppInput,
  ListAppsOpts,
} from "./types/graph-app-db";

// ── Graph + App repositories ──────────────────────────────────────────────────
export type { IGraphStore, IAppStore } from "./repository/graph-app.repo";
export { GraphRepository, AppRepository } from "./repository/graph-app.repo";

// ── Graph + App services ──────────────────────────────────────────────────────
export { GraphService, AppService } from "./service/graph-app.service";
export type {
  CreateGraphParams,
  CreateGraphVersionParams,
  CreateAppParams,
} from "./service/graph-app.service";
