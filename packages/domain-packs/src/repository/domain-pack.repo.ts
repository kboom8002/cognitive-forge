/**
 * IDomainPackStore — storage adapter interface.
 * Implemented by SupabaseDomainPackStore in apps/web/lib.
 * Keeps packages/domain-packs Supabase-free.
 */

import type {
  DomainPackRow,
  DomainPackVersionRow,
  DomainPackAssetRow,
  CreateDomainPackInput,
  CreateDomainPackVersionInput,
  CreateAssetInput,
  ListDomainPacksOpts,
} from "../types/db";

export interface IDomainPackStore {
  findById(id: string): Promise<DomainPackRow | null>;
  findByKey(key: string): Promise<DomainPackRow | null>;
  list(opts: ListDomainPacksOpts): Promise<DomainPackRow[]>;
  create(input: CreateDomainPackInput): Promise<DomainPackRow>;

  findVersionById(versionId: string): Promise<DomainPackVersionRow | null>;
  findCurrentVersion(packId: string): Promise<DomainPackVersionRow | null>;
  createVersion(input: CreateDomainPackVersionInput): Promise<DomainPackVersionRow>;
  unsetCurrentVersions(packId: string): Promise<void>;
  setVersionCurrent(versionId: string): Promise<void>;

  listAssets(packId: string): Promise<DomainPackAssetRow[]>;
  createAsset(input: CreateAssetInput): Promise<DomainPackAssetRow>;
  deleteAssets(packId: string): Promise<void>;
}

// ── Repository ────────────────────────────────────────────────────────────────

export class DomainPackRepository {
  constructor(private readonly store: IDomainPackStore) {}

  findById(id: string): Promise<DomainPackRow | null> {
    return this.store.findById(id);
  }

  findByKey(key: string): Promise<DomainPackRow | null> {
    return this.store.findByKey(key);
  }

  list(opts: ListDomainPacksOpts = {}): Promise<DomainPackRow[]> {
    return this.store.list(opts);
  }

  create(input: CreateDomainPackInput): Promise<DomainPackRow> {
    return this.store.create(input);
  }

  findVersionById(versionId: string): Promise<DomainPackVersionRow | null> {
    return this.store.findVersionById(versionId);
  }

  findCurrentVersion(packId: string): Promise<DomainPackVersionRow | null> {
    return this.store.findCurrentVersion(packId);
  }

  createVersion(input: CreateDomainPackVersionInput): Promise<DomainPackVersionRow> {
    return this.store.createVersion(input);
  }

  async promoteVersion(packId: string, versionId: string): Promise<void> {
    await this.store.unsetCurrentVersions(packId);
    await this.store.setVersionCurrent(versionId);
  }

  listAssets(packId: string): Promise<DomainPackAssetRow[]> {
    return this.store.listAssets(packId);
  }

  createAsset(input: CreateAssetInput): Promise<DomainPackAssetRow> {
    return this.store.createAsset(input);
  }

  /** Replaces all asset rows for a pack (used when a new version is created). */
  async replaceAssets(packId: string, assets: CreateAssetInput[]): Promise<DomainPackAssetRow[]> {
    await this.store.deleteAssets(packId);
    return Promise.all(assets.map((a) => this.store.createAsset(a)));
  }
}
