/**
 * IGraphStore — storage adapter for casepack_graphs and graph_versions.
 * IAppStore  — storage adapter for apps.
 * Both implemented by Supabase adapters in apps/web/lib.
 */

import type {
  GraphRow,
  GraphVersionRow,
  CreateGraphInput,
  CreateGraphVersionInput,
  ListGraphsOpts,
  AppRow,
  CreateAppInput,
  ListAppsOpts,
} from "../types/graph-app-db";

// ── Graph store ───────────────────────────────────────────────────────────────

export interface IGraphStore {
  findById(id: string): Promise<GraphRow | null>;
  findByKey(key: string): Promise<GraphRow | null>;
  list(opts: ListGraphsOpts): Promise<GraphRow[]>;
  create(input: CreateGraphInput): Promise<GraphRow>;

  findVersionById(versionId: string): Promise<GraphVersionRow | null>;
  findCurrentVersion(graphId: string): Promise<GraphVersionRow | null>;
  createVersion(input: CreateGraphVersionInput): Promise<GraphVersionRow>;
  unsetCurrentVersions(graphId: string): Promise<void>;
  setVersionCurrent(versionId: string): Promise<void>;
}

export class GraphRepository {
  constructor(private readonly store: IGraphStore) {}

  findById(id: string): Promise<GraphRow | null> { return this.store.findById(id); }
  findByKey(key: string): Promise<GraphRow | null> { return this.store.findByKey(key); }
  list(opts: ListGraphsOpts = {}): Promise<GraphRow[]> { return this.store.list(opts); }
  create(input: CreateGraphInput): Promise<GraphRow> { return this.store.create(input); }
  findVersionById(id: string): Promise<GraphVersionRow | null> { return this.store.findVersionById(id); }
  findCurrentVersion(graphId: string): Promise<GraphVersionRow | null> { return this.store.findCurrentVersion(graphId); }
  createVersion(input: CreateGraphVersionInput): Promise<GraphVersionRow> { return this.store.createVersion(input); }

  async promoteVersion(graphId: string, versionId: string): Promise<void> {
    await this.store.unsetCurrentVersions(graphId);
    await this.store.setVersionCurrent(versionId);
  }
}

// ── App store ─────────────────────────────────────────────────────────────────

export interface IAppStore {
  findById(id: string): Promise<AppRow | null>;
  findBySlug(slug: string): Promise<AppRow | null>;
  list(opts: ListAppsOpts): Promise<AppRow[]>;
  create(input: CreateAppInput): Promise<AppRow>;
}

export class AppRepository {
  constructor(private readonly store: IAppStore) {}

  findById(id: string): Promise<AppRow | null> { return this.store.findById(id); }
  findBySlug(slug: string): Promise<AppRow | null> { return this.store.findBySlug(slug); }
  list(opts: ListAppsOpts = {}): Promise<AppRow[]> { return this.store.list(opts); }
  create(input: CreateAppInput): Promise<AppRow> { return this.store.create(input); }
}
