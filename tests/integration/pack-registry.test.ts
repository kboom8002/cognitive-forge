/**
 * Domain Pack Registry — Integration Tests
 *
 * Uses a mock IDomainPackStore to test the full service layer without a live DB.
 *
 * Coverage:
 *   - DomainPackService.list
 *   - DomainPackService.create (valid + invalid key + duplicate)
 *   - DomainPackService.getById (found + NOT_FOUND)
 *   - DomainPackService.createVersion (valid manifest, invalid manifest, asset sync)
 *   - DomainPackService.validateManifest (valid + invalid primary_app_slug)
 *   - DomainPackService.listPackApps
 *   - DomainPackService.getVersion (found + NOT_FOUND)
 */

import { describe, it, expect, vi } from "vitest";
import type { Mock } from "vitest";
import {
  DomainPackRepository,
  DomainPackService,
  type IDomainPackStore,
  type DomainPackRow,
  type DomainPackVersionRow,
  type DomainPackAssetRow,
} from "@cognitive-forge/domain-packs";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const PACK_ROW: DomainPackRow = {
  id:               "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  workspace_id:     "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  key:              "pack.corporate_pr.v1",
  status:           "draft",
  visibility:       "workspace",
  primary_app_slug: "corporate-pr-suite",
  created_at:       "2026-05-02T00:00:00Z",
  updated_at:       "2026-05-02T00:00:00Z",
};

// Valid DomainPackManifest — primary_app_slug MUST exist in assets.apps
const VALID_MANIFEST = {
  key:              "pack.corporate_pr.v1",
  version:          "1.0.0",
  status:           "draft",
  primary_app_slug: "corporate-pr-suite",
  assets: {
    apps: [
      { slug: "corporate-pr-suite", casepack_key: "casepack.pr_statement.v1", title: "PR Suite" },
    ],
    casepacks: ["casepack.pr_statement.v1"],
  },
};

const VERSION_ROW: DomainPackVersionRow = {
  id:             "cccccccc-cccc-cccc-cccc-cccccccccccc",
  domain_pack_id: PACK_ROW.id,
  version:        "1.0.0",
  manifest_json:  VALID_MANIFEST,
  is_current:     false,
  created_at:     "2026-05-02T00:00:00Z",
};

const APP_ASSET_ROW: DomainPackAssetRow = {
  id:             "dddddddd-dddd-dddd-dddd-dddddddddddd",
  domain_pack_id: PACK_ROW.id,
  asset_type:     "app",
  asset_key:      "corporate-pr-suite",
  created_at:     "2026-05-02T00:00:00Z",
};

const CASEPACK_ASSET_ROW: DomainPackAssetRow = {
  id:             "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
  domain_pack_id: PACK_ROW.id,
  asset_type:     "casepack",
  asset_key:      "casepack.pr_statement.v1",
  created_at:     "2026-05-02T00:00:00Z",
};

// ── Mock store factory ────────────────────────────────────────────────────────

function makeMockStore(overrides: Partial<IDomainPackStore> = {}): IDomainPackStore {
  return {
    findById:             vi.fn().mockResolvedValue(null),
    findByKey:            vi.fn().mockResolvedValue(null),
    list:                 vi.fn().mockResolvedValue([]),
    create:               vi.fn().mockResolvedValue(PACK_ROW),
    findVersionById:      vi.fn().mockResolvedValue(null),
    findCurrentVersion:   vi.fn().mockResolvedValue(null),
    createVersion:        vi.fn().mockResolvedValue(VERSION_ROW),
    unsetCurrentVersions: vi.fn().mockResolvedValue(undefined),
    setVersionCurrent:    vi.fn().mockResolvedValue(undefined),
    listAssets:           vi.fn().mockResolvedValue([]),
    createAsset:          vi.fn().mockResolvedValue(APP_ASSET_ROW),
    deleteAssets:         vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeService(store: IDomainPackStore): DomainPackService {
  return new DomainPackService(new DomainPackRepository(store));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("DomainPackService.list", () => {
  it("returns empty array when no packs exist", async () => {
    expect(await makeService(makeMockStore()).list()).toEqual([]);
  });

  it("returns packs from store", async () => {
    const svc  = makeService(makeMockStore({ list: vi.fn().mockResolvedValue([PACK_ROW]) }));
    const result = await svc.list({ workspace_id: PACK_ROW.workspace_id! });
    expect(result).toHaveLength(1);
    expect(result[0]!.key).toBe("pack.corporate_pr.v1");
  });
});

describe("DomainPackService.create", () => {
  it("creates a pack with valid key", async () => {
    const store = makeMockStore();
    const pack  = await makeService(store).create({
      key: "pack.corporate_pr.v1", primary_app_slug: "corporate-pr-suite",
    });
    expect(pack.key).toBe(PACK_ROW.key);
    expect((store.create as Mock)).toHaveBeenCalledOnce();
  });

  it("applies default status=draft and visibility=workspace", async () => {
    const store = makeMockStore();
    await makeService(store).create({ key: "pack.corporate_pr.v1", primary_app_slug: "corp" });
    expect((store.create as Mock)).toHaveBeenCalledWith(
      expect.objectContaining({ status: "draft", visibility: "workspace" })
    );
  });

  it("REJECTS — invalid key format (missing prefix)", async () => {
    await expect(
      makeService(makeMockStore()).create({ key: "corporate_pr.v1", primary_app_slug: "corp" })
    ).rejects.toThrow("Invalid Domain Pack key");
  });

  it("REJECTS — invalid key format (uppercase)", async () => {
    await expect(
      makeService(makeMockStore()).create({ key: "pack.Corporate_PR.v1", primary_app_slug: "corp" })
    ).rejects.toThrow("Invalid Domain Pack key");
  });

  it("REJECTS — duplicate key", async () => {
    const store = makeMockStore({ findByKey: vi.fn().mockResolvedValue(PACK_ROW) });
    await expect(
      makeService(store).create({ key: "pack.corporate_pr.v1", primary_app_slug: "corp" })
    ).rejects.toThrow("already exists");
  });
});

describe("DomainPackService.getById", () => {
  it("returns pack when found", async () => {
    const store = makeMockStore({ findById: vi.fn().mockResolvedValue(PACK_ROW) });
    const pack  = await makeService(store).getById(PACK_ROW.id);
    expect(pack.primary_app_slug).toBe("corporate-pr-suite");
  });

  it("REJECTS — NOT_FOUND when pack does not exist", async () => {
    await expect(makeService(makeMockStore()).getById("nope"))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("DomainPackService.validateManifest", () => {
  it("returns valid=true for a correct manifest", () => {
    const svc    = makeService(makeMockStore());
    const result = svc.validateManifest(VALID_MANIFEST);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("RULE 4: returns valid=false when primary_app_slug not in assets.apps", () => {
    const badManifest = { ...VALID_MANIFEST, primary_app_slug: "nonexistent-app" };
    const result      = makeService(makeMockStore()).validateManifest(badManifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("primary_app_slug"))).toBe(true);
  });

  it("returns valid=false for manifest missing assets.apps", () => {
    const result = makeService(makeMockStore()).validateManifest({ key: "pack.test.v1" });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("returns error paths in errors array", () => {
    const result = makeService(makeMockStore()).validateManifest({});
    expect(result.errors.every((e) => typeof e === "string")).toBe(true);
  });
});

describe("DomainPackService.createVersion", () => {
  it("validates manifest and creates version row", async () => {
    const store   = makeMockStore({ findById: vi.fn().mockResolvedValue(PACK_ROW) });
    const version = await makeService(store).createVersion(PACK_ROW.id, {
      version: "1.0.0", manifest_json: VALID_MANIFEST,
    });
    expect(version.id).toBe(VERSION_ROW.id);
    expect((store.createVersion as Mock)).toHaveBeenCalledOnce();
  });

  it("syncs assets from manifest — creates app + casepack assets", async () => {
    const store = makeMockStore({ findById: vi.fn().mockResolvedValue(PACK_ROW) });
    await makeService(store).createVersion(PACK_ROW.id, {
      version: "1.0.0", manifest_json: VALID_MANIFEST,
    });
    // deleteAssets called once to replace, then createAsset for each asset
    expect((store.deleteAssets as Mock)).toHaveBeenCalledWith(PACK_ROW.id);
    // 1 app + 1 casepack = 2 createAsset calls
    expect((store.createAsset as Mock)).toHaveBeenCalledTimes(2);
  });

  it("promotes to current when set_current=true", async () => {
    const store = makeMockStore({ findById: vi.fn().mockResolvedValue(PACK_ROW) });
    await makeService(store).createVersion(PACK_ROW.id, {
      version: "1.0.0", manifest_json: VALID_MANIFEST, set_current: true,
    });
    expect((store.unsetCurrentVersions as Mock)).toHaveBeenCalledWith(PACK_ROW.id);
    expect((store.setVersionCurrent as Mock)).toHaveBeenCalledWith(VERSION_ROW.id);
  });

  it("does NOT promote when set_current omitted", async () => {
    const store = makeMockStore({ findById: vi.fn().mockResolvedValue(PACK_ROW) });
    await makeService(store).createVersion(PACK_ROW.id, {
      version: "1.0.0", manifest_json: VALID_MANIFEST,
    });
    expect((store.unsetCurrentVersions as Mock)).not.toHaveBeenCalled();
  });

  it("REJECTS — invalid manifest (primary_app_slug not in assets.apps)", async () => {
    const store      = makeMockStore({ findById: vi.fn().mockResolvedValue(PACK_ROW) });
    const badManifest = { ...VALID_MANIFEST, primary_app_slug: "ghost-app" };
    await expect(
      makeService(store).createVersion(PACK_ROW.id, { version: "1.0.0", manifest_json: badManifest })
    ).rejects.toThrow();
  });

  it("REJECTS — parent pack not found", async () => {
    await expect(
      makeService(makeMockStore()).createVersion("nope", { version: "1.0.0", manifest_json: VALID_MANIFEST })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("creates bridge and graph assets when present in manifest", async () => {
    const store = makeMockStore({ findById: vi.fn().mockResolvedValue(PACK_ROW) });
    const manifestWithAll = {
      ...VALID_MANIFEST,
      assets: {
        ...VALID_MANIFEST.assets,
        bridges: ["bridge.pr_to_social.v1"],
        graphs:  ["graph.pr_workflow.v1"],
      },
    };
    await makeService(store).createVersion(PACK_ROW.id, {
      version: "1.0.0", manifest_json: manifestWithAll,
    });
    // 1 app + 1 casepack + 1 bridge + 1 graph = 4 createAsset calls
    expect((store.createAsset as Mock)).toHaveBeenCalledTimes(4);
  });
});

describe("DomainPackService.listPackApps", () => {
  it("returns only app assets", async () => {
    const store = makeMockStore({
      findById:   vi.fn().mockResolvedValue(PACK_ROW),
      listAssets: vi.fn().mockResolvedValue([APP_ASSET_ROW, CASEPACK_ASSET_ROW]),
    });
    const apps = await makeService(store).listPackApps(PACK_ROW.id);
    expect(apps).toHaveLength(1);
    expect(apps[0]!.asset_type).toBe("app");
  });

  it("REJECTS — NOT_FOUND when pack does not exist", async () => {
    await expect(makeService(makeMockStore()).listPackApps("nope"))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("DomainPackService.getVersion", () => {
  it("returns version when found", async () => {
    const store   = makeMockStore({ findVersionById: vi.fn().mockResolvedValue(VERSION_ROW) });
    const version = await makeService(store).getVersion(VERSION_ROW.id);
    expect(version.version).toBe("1.0.0");
  });

  it("REJECTS — NOT_FOUND when version does not exist", async () => {
    await expect(makeService(makeMockStore()).getVersion("nope"))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// ── HTTP integration tests (require live Next.js + Supabase) ─────────────────

describe.todo("GET /api/packs returns 200 with pack list");
describe.todo("POST /api/packs returns 201 with created pack");
describe.todo("POST /api/packs returns 400 for invalid key format");
describe.todo("GET /api/packs/:id returns 200 with pack metadata");
describe.todo("GET /api/packs/:id returns 404 for unknown id");
describe.todo("POST /api/packs/:id/versions returns 201 without manifest_json in body");
describe.todo("POST /api/packs/:id/versions returns 400 when primary_app_slug missing from apps");
describe.todo("POST /api/packs/:id/validate returns { valid: true } for correct manifest");
describe.todo("POST /api/packs/:id/validate returns { valid: false } for invalid manifest");
describe.todo("GET /api/packs/:id/apps returns only app-type assets");
