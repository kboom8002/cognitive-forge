/**
 * CasePack Registry — Integration Tests
 *
 * Uses a mock ICasePackStore to test the full service layer without a live DB.
 * HTTP-level route tests are marked .todo (require running Next.js + Supabase).
 *
 * Coverage:
 *   - CasePackService.list
 *   - CasePackService.create (valid + invalid key format + duplicate key)
 *   - CasePackService.createVersion (valid atomic, valid bridge, missing W_watchouts)
 *   - CasePackService.getById (found + not found)
 *   - CasePackService.getVersion (found + not found)
 *   - set_current promotion flow
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";
import {
  CasePackRepository,
  CasePackService,
  type ICasePackStore,
  type CasePackRow,
  type CasePackVersionRow,
} from "@cognitive-forge/casepack";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const PACK_ROW: CasePackRow = {
  id: "11111111-1111-1111-1111-111111111111",
  workspace_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  key: "casepack.pr_statement.v1",
  status: "draft",
  visibility: "workspace",
  created_at: "2026-05-02T00:00:00Z",
  updated_at: "2026-05-02T00:00:00Z",
};

const VALID_TASKFLOW_CX = {
  R_role:            "Professional PR writer for tech companies",
  S_situation:       "Client needs a press release for a product launch",
  T_task:            "Write a concise, newsworthy press release in AP style",
  W_watchouts:       "Do not include legal disclaimers or speculative revenue figures",
  O_output_contract: "A 300-word press release with headline, dateline, body, and boilerplate",
};

const VALID_INPUT_CONTRACT = {
  fields: [{ key: "topic", type: "text", label: "Topic", required: true }],
  required_fields: ["topic"],
};

const VALID_OUTPUT_CONTRACT = {
  fields: [{ key: "headline", type: "text", label: "Headline", required: true }],
  required_fields: ["headline"],
  public_fields: ["headline"],
};

const VALID_RUNTIME_CONTRACT = {
  execution_type: "single_casepack" as const,
  provider: "openai",
  model: "gpt-4o",
};

const VALID_UI_SCHEMA = {
  app_mode: "micro_app" as const,
  layout: "single_column" as const,
};

const VALID_CASEPACK_JSON = {
  key: "casepack.pr_statement.v1",
  version: "1.0.0",
  status: "draft",
  taskflow_cx:      VALID_TASKFLOW_CX,
  input_contract:   VALID_INPUT_CONTRACT,
  output_contract:  VALID_OUTPUT_CONTRACT,
  runtime_contract: VALID_RUNTIME_CONTRACT,
  ui_schema:        VALID_UI_SCHEMA,
};

const VERSION_ROW: CasePackVersionRow = {
  id: "22222222-2222-2222-2222-222222222222",
  casepack_id: PACK_ROW.id,
  version: "1.0.0",
  casepack_json: VALID_CASEPACK_JSON,
  manifest_json: null,
  is_current: false,
  created_at: "2026-05-02T00:00:00Z",
};

// ── Mock store factory ────────────────────────────────────────────────────────

function makeMockStore(overrides: Partial<ICasePackStore> = {}): ICasePackStore {
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
    ...overrides,
  };
}

function makeService(store: ICasePackStore): CasePackService {
  return new CasePackService(new CasePackRepository(store));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("CasePackService.list", () => {
  it("returns empty array when no packs exist", async () => {
    const svc = makeService(makeMockStore());
    expect(await svc.list()).toEqual([]);
  });

  it("returns packs from store", async () => {
    const svc = makeService(makeMockStore({ list: vi.fn().mockResolvedValue([PACK_ROW]) }));
    const result = await svc.list({ workspace_id: PACK_ROW.workspace_id! });
    expect(result).toHaveLength(1);
    expect(result[0]!.key).toBe(PACK_ROW.key);
  });
});

describe("CasePackService.create", () => {
  it("creates a CasePack with valid key", async () => {
    const store = makeMockStore();
    const svc   = makeService(store);
    const pack  = await svc.create({ key: "casepack.pr_statement.v1" });
    expect(pack.key).toBe(PACK_ROW.key);
    expect((store.create as Mock)).toHaveBeenCalledOnce();
  });

  it("REJECTS — invalid key format (missing prefix)", async () => {
    const svc = makeService(makeMockStore());
    await expect(svc.create({ key: "pr_statement.v1" })).rejects.toThrow(
      "Invalid CasePack key"
    );
  });

  it("REJECTS — invalid key format (uppercase)", async () => {
    const svc = makeService(makeMockStore());
    await expect(svc.create({ key: "casepack.PR_Statement.v1" })).rejects.toThrow(
      "Invalid CasePack key"
    );
  });

  it("REJECTS — duplicate key", async () => {
    const store = makeMockStore({ findByKey: vi.fn().mockResolvedValue(PACK_ROW) });
    const svc   = makeService(store);
    await expect(svc.create({ key: "casepack.pr_statement.v1" })).rejects.toThrow(
      "already exists"
    );
  });

  it("applies default status=draft and visibility=workspace", async () => {
    const store = makeMockStore();
    await makeService(store).create({ key: "casepack.pr_statement.v1" });
    expect((store.create as Mock)).toHaveBeenCalledWith(
      expect.objectContaining({ status: "draft", visibility: "workspace" })
    );
  });
});

describe("CasePackService.getById", () => {
  it("returns the pack when found", async () => {
    const store = makeMockStore({ findById: vi.fn().mockResolvedValue(PACK_ROW) });
    const pack  = await makeService(store).getById(PACK_ROW.id);
    expect(pack.id).toBe(PACK_ROW.id);
  });

  it("REJECTS — NOT_FOUND when pack does not exist", async () => {
    const svc = makeService(makeMockStore());
    await expect(svc.getById("nonexistent-id")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("CasePackService.createVersion — valid atomic CasePack", () => {
  it("RULE 1: valid atomic CasePack fixture validates and creates version", async () => {
    const store   = makeMockStore({ findById: vi.fn().mockResolvedValue(PACK_ROW) });
    const version = await makeService(store).createVersion(PACK_ROW.id, {
      version: "1.0.0",
      casepack_json: VALID_CASEPACK_JSON,
    });
    expect(version.id).toBe(VERSION_ROW.id);
    expect((store.createVersion as Mock)).toHaveBeenCalledOnce();
  });

  it("REJECTS — casepack_json missing W_watchouts", async () => {
    const store = makeMockStore({ findById: vi.fn().mockResolvedValue(PACK_ROW) });
    const badJson = {
      ...VALID_CASEPACK_JSON,
      taskflow_cx: { ...VALID_TASKFLOW_CX, W_watchouts: [] }, // empty
    };
    await expect(
      makeService(store).createVersion(PACK_ROW.id, { version: "1.0.0", casepack_json: badJson })
    ).rejects.toThrow();
  });

  it("REJECTS — casepack_json with no taskflow_cx", async () => {
    const store = makeMockStore({ findById: vi.fn().mockResolvedValue(PACK_ROW) });
    const { taskflow_cx: _, ...noTaskflow } = VALID_CASEPACK_JSON;
    await expect(
      makeService(store).createVersion(PACK_ROW.id, { version: "1.0.0", casepack_json: noTaskflow })
    ).rejects.toThrow();
  });

  it("REJECTS — parent CasePack not found", async () => {
    const svc = makeService(makeMockStore());
    await expect(
      svc.createVersion("nonexistent-id", { version: "1.0.0", casepack_json: VALID_CASEPACK_JSON })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("CasePackService.createVersion — bridge CasePack (RULE 2)", () => {
  const BRIDGE_CASEPACK_JSON = {
    ...VALID_CASEPACK_JSON,
    key: "casepack.bridge_pr.v1",
    runtime_contract: {
      execution_type: "bridge_casepack" as const,
      provider: "openai",
      model: "gpt-4o",
      bridge_key: "bridge.pr_to_social.v1",
    },
  };

  it("RULE 2: valid bridge CasePack fixture validates", async () => {
    const store = makeMockStore({ findById: vi.fn().mockResolvedValue(PACK_ROW) });
    const version = await makeService(store).createVersion(PACK_ROW.id, {
      version: "1.0.0",
      casepack_json: BRIDGE_CASEPACK_JSON,
    });
    expect(version.id).toBe(VERSION_ROW.id);
  });
});

describe("CasePackService.createVersion — set_current promotion", () => {
  it("promotes version to current when set_current=true", async () => {
    const store = makeMockStore({ findById: vi.fn().mockResolvedValue(PACK_ROW) });
    await makeService(store).createVersion(PACK_ROW.id, {
      version: "1.0.0",
      casepack_json: VALID_CASEPACK_JSON,
      set_current: true,
    });
    expect((store.unsetCurrentVersions as Mock)).toHaveBeenCalledWith(PACK_ROW.id);
    expect((store.setVersionCurrent as Mock)).toHaveBeenCalledWith(VERSION_ROW.id);
  });

  it("does NOT promote when set_current is false/omitted", async () => {
    const store = makeMockStore({ findById: vi.fn().mockResolvedValue(PACK_ROW) });
    await makeService(store).createVersion(PACK_ROW.id, {
      version: "1.0.0",
      casepack_json: VALID_CASEPACK_JSON,
    });
    expect((store.unsetCurrentVersions as Mock)).not.toHaveBeenCalled();
  });
});

describe("CasePackService.getVersion", () => {
  it("returns version when found", async () => {
    const store   = makeMockStore({ findVersionById: vi.fn().mockResolvedValue(VERSION_ROW) });
    const version = await makeService(store).getVersion(VERSION_ROW.id);
    expect(version.version).toBe("1.0.0");
  });

  it("REJECTS — NOT_FOUND when version does not exist", async () => {
    const svc = makeService(makeMockStore());
    await expect(svc.getVersion("nonexistent-ver")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

// ── HTTP integration tests (require live Next.js + Supabase) ─────────────────

describe.todo("GET /api/casepacks?workspaceId=... returns 200 with pack list");
describe.todo("POST /api/casepacks returns 201 with created pack");
describe.todo("POST /api/casepacks returns 400 for invalid key format");
describe.todo("GET /api/casepacks/:id returns 200 with pack metadata");
describe.todo("GET /api/casepacks/:id returns 404 for unknown id");
describe.todo("POST /api/casepacks/:id/versions returns 201 without casepack_json in body");
describe.todo("POST /api/casepacks/:id/versions returns 400 when W_watchouts missing");
describe.todo("GET /api/casepacks/:id/versions/:versionId returns 200 with full version");
