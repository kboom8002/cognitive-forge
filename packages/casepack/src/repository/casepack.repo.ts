/**
 * ICasePackStore — storage adapter interface.
 * Implemented by SupabaseCasePackStore in apps/web/lib.
 * Keeps packages/casepack Supabase-free.
 *
 * CasePackRepository delegates all persistence to this interface,
 * making it fully testable via mock injection.
 */

import type {
  CasePackRow,
  CasePackVersionRow,
  CreateCasePackInput,
  CreateCasePackVersionInput,
  ListCasePacksOpts,
} from "../types/db";

export interface ICasePackStore {
  findById(id: string): Promise<CasePackRow | null>;
  findByKey(key: string): Promise<CasePackRow | null>;
  list(opts: ListCasePacksOpts): Promise<CasePackRow[]>;
  create(input: CreateCasePackInput): Promise<CasePackRow>;

  findVersionById(versionId: string): Promise<CasePackVersionRow | null>;
  findCurrentVersion(casepackId: string): Promise<CasePackVersionRow | null>;
  createVersion(input: CreateCasePackVersionInput): Promise<CasePackVersionRow>;

  /** Unsets is_current on all versions of a pack before promoting a new current. */
  unsetCurrentVersions(casepackId: string): Promise<void>;
  /** Sets is_current = true for a specific version row. */
  setVersionCurrent(versionId: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class CasePackRepository {
  constructor(private readonly store: ICasePackStore) {}

  findById(id: string): Promise<CasePackRow | null> {
    return this.store.findById(id);
  }

  findByKey(key: string): Promise<CasePackRow | null> {
    return this.store.findByKey(key);
  }

  list(opts: ListCasePacksOpts = {}): Promise<CasePackRow[]> {
    return this.store.list(opts);
  }

  create(input: CreateCasePackInput): Promise<CasePackRow> {
    return this.store.create(input);
  }

  findVersionById(versionId: string): Promise<CasePackVersionRow | null> {
    return this.store.findVersionById(versionId);
  }

  findCurrentVersion(casepackId: string): Promise<CasePackVersionRow | null> {
    return this.store.findCurrentVersion(casepackId);
  }

  createVersion(input: CreateCasePackVersionInput): Promise<CasePackVersionRow> {
    return this.store.createVersion(input);
  }

  async promoteVersion(casepackId: string, versionId: string): Promise<void> {
    await this.store.unsetCurrentVersions(casepackId);
    await this.store.setVersionCurrent(versionId);
  }
}
