/**
 * Graph + App Registry — Integration Tests
 *
 * Uses mock stores to test the full service layer without a live DB.
 *
 * Coverage:
 *   GraphService: list, create (valid/invalid key/duplicate), getById, createVersion
 *     (valid graph, entry_node missing, edge ref missing, set_current promotion)
 *   AppService: list, create (casepack app, graph app, XOR violations, duplicate slug)
 *   getVersion + getBySlug NOT_FOUND handling
 */

import { describe, it, expect, vi } from "vitest";
import type { Mock } from "vitest";
import {
  GraphRepository, GraphService,
  AppRepository, AppService,
  type IGraphStore, type IAppStore,
  type GraphRow, type GraphVersionRow,
  type AppRow,
} from "@cognitive-forge/casepack";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const GRAPH_ROW: GraphRow = {
  id:           "11111111-1111-1111-1111-111111111111",
  workspace_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  key:          "graph.corporate_pr_suite.v1",
  status:       "draft",
  entry_node:   "pr_statement",
  final_nodes:  ["social_copy"],
  created_at:   "2026-05-02T00:00:00Z",
  updated_at:   "2026-05-02T00:00:00Z",
};

// Valid CasePackGraph — entry_node and final_nodes must exist in nodes[].id
const VALID_GRAPH_JSON = {
  key:        "graph.corporate_pr_suite.v1",
  version:    "1.0.0",
  status:     "draft",
  entry_node: "pr_statement",
  final_nodes: ["social_copy"],
  nodes: [
    { id: "pr_statement", casepack_key: "casepack.pr_statement.v1", label: "PR Statement" },
    { id: "social_copy",  casepack_key: "casepack.social_copy.v1",  label: "Social Copy" },
  ],
  edges: [
    { from: "pr_statement", to: "social_copy" },
  ],
};

const VERSION_ROW: GraphVersionRow = {
  id:         "22222222-2222-2222-2222-222222222222",
  graph_id:   GRAPH_ROW.id,
  version:    "1.0.0",
  graph_json: VALID_GRAPH_JSON,
  is_current: false,
  created_at: "2026-05-02T00:00:00Z",
};

const CASEPACK_APP_ROW: AppRow = {
  id:           "33333333-3333-3333-3333-333333333333",
  workspace_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  slug:         "corporate-pr-app",
  title:        "Corporate PR",
  description:  null,
  type:         "casepack",
  casepack_key: "casepack.pr_statement.v1",
  graph_key:    null,
  visibility:   "workspace",
  pack_key:     null,
  extra:        {},
  created_at:   "2026-05-02T00:00:00Z",
  updated_at:   "2026-05-02T00:00:00Z",
};

const GRAPH_APP_ROW: AppRow = {
  ...CASEPACK_APP_ROW,
  id:           "44444444-4444-4444-4444-444444444444",
  slug:         "corporate-pr-suite",
  type:         "graph",
  casepack_key: null,
  graph_key:    "graph.corporate_pr_suite.v1",
};

// ── Mock store factories ──────────────────────────────────────────────────────

function makeMockGraphStore(overrides: Partial<IGraphStore> = {}): IGraphStore {
  return {
    findById:             vi.fn().mockResolvedValue(null),
    findByKey:            vi.fn().mockResolvedValue(null),
    list:                 vi.fn().mockResolvedValue([]),
    create:               vi.fn().mockResolvedValue(GRAPH_ROW),
    findVersionById:      vi.fn().mockResolvedValue(null),
    findCurrentVersion:   vi.fn().mockResolvedValue(null),
    createVersion:        vi.fn().mockResolvedValue(VERSION_ROW),
    unsetCurrentVersions: vi.fn().mockResolvedValue(undefined),
    setVersionCurrent:    vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeMockAppStore(overrides: Partial<IAppStore> = {}): IAppStore {
  return {
    findById:   vi.fn().mockResolvedValue(null),
    findBySlug: vi.fn().mockResolvedValue(null),
    list:       vi.fn().mockResolvedValue([]),
    create:     vi.fn().mockResolvedValue(CASEPACK_APP_ROW),
    ...overrides,
  };
}

function makeGraphService(store: IGraphStore) { return new GraphService(new GraphRepository(store)); }
function makeAppService(store: IAppStore) { return new AppService(new AppRepository(store)); }

// ── GraphService tests ────────────────────────────────────────────────────────

describe("GraphService.list", () => {
  it("returns empty array when no graphs exist", async () => {
    expect(await makeGraphService(makeMockGraphStore()).list()).toEqual([]);
  });

  it("returns graphs from store", async () => {
    const svc  = makeGraphService(makeMockGraphStore({ list: vi.fn().mockResolvedValue([GRAPH_ROW]) }));
    const list = await svc.list({ workspace_id: GRAPH_ROW.workspace_id! });
    expect(list).toHaveLength(1);
    expect(list[0]!.key).toBe("graph.corporate_pr_suite.v1");
  });
});

describe("GraphService.create", () => {
  it("creates graph with valid key", async () => {
    const store = makeMockGraphStore();
    const graph = await makeGraphService(store).create({ key: "graph.corporate_pr_suite.v1" });
    expect(graph.key).toBe(GRAPH_ROW.key);
    expect((store.create as Mock)).toHaveBeenCalledOnce();
  });

  it("REJECTS — invalid key format (wrong prefix)", async () => {
    await expect(makeGraphService(makeMockGraphStore()).create({ key: "corporate_pr_suite.v1" }))
      .rejects.toThrow("Invalid graph key");
  });

  it("REJECTS — invalid key (uppercase)", async () => {
    await expect(makeGraphService(makeMockGraphStore()).create({ key: "graph.CorporatePR.v1" }))
      .rejects.toThrow("Invalid graph key");
  });

  it("REJECTS — duplicate key", async () => {
    const store = makeMockGraphStore({ findByKey: vi.fn().mockResolvedValue(GRAPH_ROW) });
    await expect(makeGraphService(store).create({ key: "graph.corporate_pr_suite.v1" }))
      .rejects.toThrow("already exists");
  });

  it("applies default status=draft", async () => {
    const store = makeMockGraphStore();
    await makeGraphService(store).create({ key: "graph.corporate_pr_suite.v1" });
    expect((store.create as Mock)).toHaveBeenCalledWith(
      expect.objectContaining({ status: "draft" })
    );
  });
});

describe("GraphService.getById", () => {
  it("returns graph when found", async () => {
    const store = makeMockGraphStore({ findById: vi.fn().mockResolvedValue(GRAPH_ROW) });
    const graph = await makeGraphService(store).getById(GRAPH_ROW.id);
    expect(graph.entry_node).toBe("pr_statement");
  });

  it("REJECTS — NOT_FOUND", async () => {
    await expect(makeGraphService(makeMockGraphStore()).getById("nope"))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("GraphService.createVersion", () => {
  it("RULE 3: valid graph JSON creates version", async () => {
    const store   = makeMockGraphStore({ findById: vi.fn().mockResolvedValue(GRAPH_ROW) });
    const version = await makeGraphService(store).createVersion(GRAPH_ROW.id, {
      version: "1.0.0", graph_json: VALID_GRAPH_JSON,
    });
    expect(version.id).toBe(VERSION_ROW.id);
  });

  it("RULE 3: REJECTS — entry_node references non-existent node", async () => {
    const store   = makeMockGraphStore({ findById: vi.fn().mockResolvedValue(GRAPH_ROW) });
    const badJson = { ...VALID_GRAPH_JSON, entry_node: "ghost_node" };
    await expect(makeGraphService(store).createVersion(GRAPH_ROW.id, { version: "1.0.0", graph_json: badJson }))
      .rejects.toThrow();
  });

  it("REJECTS — edge.from references non-existent node", async () => {
    const store   = makeMockGraphStore({ findById: vi.fn().mockResolvedValue(GRAPH_ROW) });
    const badJson = { ...VALID_GRAPH_JSON, edges: [{ from: "ghost", to: "social_copy" }] };
    await expect(makeGraphService(store).createVersion(GRAPH_ROW.id, { version: "1.0.0", graph_json: badJson }))
      .rejects.toThrow();
  });

  it("REJECTS — missing nodes array", async () => {
    const store   = makeMockGraphStore({ findById: vi.fn().mockResolvedValue(GRAPH_ROW) });
    const { nodes: _, ...noNodes } = VALID_GRAPH_JSON;
    await expect(makeGraphService(store).createVersion(GRAPH_ROW.id, { version: "1.0.0", graph_json: noNodes }))
      .rejects.toThrow();
  });

  it("promotes to current when set_current=true", async () => {
    const store = makeMockGraphStore({ findById: vi.fn().mockResolvedValue(GRAPH_ROW) });
    await makeGraphService(store).createVersion(GRAPH_ROW.id, {
      version: "1.0.0", graph_json: VALID_GRAPH_JSON, set_current: true,
    });
    expect((store.unsetCurrentVersions as Mock)).toHaveBeenCalledWith(GRAPH_ROW.id);
    expect((store.setVersionCurrent as Mock)).toHaveBeenCalledWith(VERSION_ROW.id);
  });

  it("does NOT promote when set_current omitted", async () => {
    const store = makeMockGraphStore({ findById: vi.fn().mockResolvedValue(GRAPH_ROW) });
    await makeGraphService(store).createVersion(GRAPH_ROW.id, {
      version: "1.0.0", graph_json: VALID_GRAPH_JSON,
    });
    expect((store.unsetCurrentVersions as Mock)).not.toHaveBeenCalled();
  });

  it("REJECTS — parent graph not found", async () => {
    await expect(makeGraphService(makeMockGraphStore()).createVersion("nope", {
      version: "1.0.0", graph_json: VALID_GRAPH_JSON,
    })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("GraphService.getVersion", () => {
  it("returns version when found", async () => {
    const store   = makeMockGraphStore({ findVersionById: vi.fn().mockResolvedValue(VERSION_ROW) });
    const version = await makeGraphService(store).getVersion(VERSION_ROW.id);
    expect(version.version).toBe("1.0.0");
  });

  it("REJECTS — NOT_FOUND", async () => {
    await expect(makeGraphService(makeMockGraphStore()).getVersion("nope"))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// ── AppService tests ──────────────────────────────────────────────────────────

describe("AppService.list", () => {
  it("returns empty array when no apps", async () => {
    expect(await makeAppService(makeMockAppStore()).list()).toEqual([]);
  });

  it("returns apps from store", async () => {
    const svc  = makeAppService(makeMockAppStore({ list: vi.fn().mockResolvedValue([CASEPACK_APP_ROW]) }));
    const apps = await svc.list({ type: "casepack" });
    expect(apps).toHaveLength(1);
    expect(apps[0]!.type).toBe("casepack");
  });
});

describe("AppService.create — casepack app", () => {
  it("creates a casepack app with valid params", async () => {
    const store = makeMockAppStore();
    const app   = await makeAppService(store).create({
      slug: "corporate-pr-app", title: "Corporate PR",
      type: "casepack", casepack_key: "casepack.pr_statement.v1", visibility: "workspace",
    });
    expect(app.slug).toBe(CASEPACK_APP_ROW.slug);
    expect((store.create as Mock)).toHaveBeenCalledOnce();
  });

  it("enforces casepack_key = null for graph app in store.create call", async () => {
    const store = makeMockAppStore({ create: vi.fn().mockResolvedValue(GRAPH_APP_ROW) });
    await makeAppService(store).create({
      slug: "corporate-pr-suite", title: "PR Suite",
      type: "graph", graph_key: "graph.corporate_pr_suite.v1",
    });
    expect((store.create as Mock)).toHaveBeenCalledWith(
      expect.objectContaining({ casepack_key: null, graph_key: "graph.corporate_pr_suite.v1" })
    );
  });

  it("RULE 5: REJECTS — type='casepack' without casepack_key (XOR violation)", async () => {
    await expect(makeAppService(makeMockAppStore()).create({
      slug: "my-app", title: "My App", type: "casepack",
    })).rejects.toThrow();
  });

  it("RULE 5: REJECTS — type='graph' without graph_key (XOR violation)", async () => {
    await expect(makeAppService(makeMockAppStore()).create({
      slug: "my-app", title: "My App", type: "graph",
    })).rejects.toThrow();
  });

  it("RULE 5: REJECTS — type='casepack' with graph_key set (XOR violation)", async () => {
    await expect(makeAppService(makeMockAppStore()).create({
      slug: "my-app", title: "My App", type: "casepack",
      casepack_key: "casepack.pr_statement.v1",
      graph_key:    "graph.pr_suite.v1",
    })).rejects.toThrow();
  });

  it("RULE 5: REJECTS — type='graph' with casepack_key set (XOR violation)", async () => {
    await expect(makeAppService(makeMockAppStore()).create({
      slug: "my-app", title: "My App", type: "graph",
      graph_key:    "graph.pr_suite.v1",
      casepack_key: "casepack.pr_statement.v1",
    })).rejects.toThrow();
  });

  it("REJECTS — duplicate slug", async () => {
    const store = makeMockAppStore({ findBySlug: vi.fn().mockResolvedValue(CASEPACK_APP_ROW) });
    await expect(makeAppService(store).create({
      slug: "corporate-pr-app", title: "Copy", type: "casepack",
      casepack_key: "casepack.pr_statement.v1",
    })).rejects.toThrow("already exists");
  });
});

// ── HTTP integration tests (require live Next.js + Supabase) ─────────────────

describe.todo("GET /api/graphs returns 200 with graph list");
describe.todo("POST /api/graphs returns 201 with created graph");
describe.todo("POST /api/graphs/:id/versions returns 201 without graph_json");
describe.todo("POST /api/graphs/:id/versions returns 400 for invalid entry_node");
describe.todo("GET /api/apps returns 200 with app list");
describe.todo("POST /api/apps returns 201 for valid casepack app");
describe.todo("POST /api/apps returns 201 for valid graph app");
describe.todo("POST /api/apps returns 400 for XOR violation (casepack + graph_key)");
