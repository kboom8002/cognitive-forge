/**
 * DB row types mirroring the casepacks and casepack_versions tables.
 * No Supabase import — pure TypeScript interfaces.
 */

export type CasePackStatus = "draft" | "published" | "deprecated" | "archived";
export type VisibilityLevel = "public" | "workspace" | "private";

export interface CasePackRow {
  id: string;
  workspace_id: string | null;
  key: string;
  status: CasePackStatus;
  visibility: VisibilityLevel;
  created_at: string;
  updated_at: string;
}

export interface CasePackVersionRow {
  id: string;
  casepack_id: string;
  version: string;
  /** FORBIDDEN PUBLIC KEY — accessible via service role only. */
  casepack_json: unknown;
  /** FORBIDDEN PUBLIC KEY */
  manifest_json: unknown | null;
  is_current: boolean;
  created_at: string;
}

export interface CreateCasePackInput {
  workspace_id?: string | null;
  key: string;
  status?: CasePackStatus;
  visibility?: VisibilityLevel;
}

export interface CreateCasePackVersionInput {
  casepack_id: string;
  version: string;
  /** Full CasePack-MAO JSON — validated before storage. */
  casepack_json: unknown;
  manifest_json?: unknown;
}

export interface ListCasePacksOpts {
  workspace_id?: string;
  status?: CasePackStatus;
  visibility?: VisibilityLevel;
}
