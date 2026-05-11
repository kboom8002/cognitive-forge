import { describe, it, expect, vi, beforeEach } from "vitest";
import { FORBIDDEN_PUBLIC_KEYS, deepSanitize } from "@cognitive-forge/validation";

import { GET as getAppContract } from "../../apps/web/app/api/public/apps/[slug]/route";
import { POST as postAppRun } from "../../apps/web/app/api/public/apps/[slug]/run/route";
import { POST as postGraphRun } from "../../apps/web/app/api/public/apps/[slug]/graph-run/route";
import { GET as getGraphRun } from "../../apps/web/app/api/public/graph-runs/[id]/route";

// --- Recursive scanner helper ---
function deepScanForForbiddenKeys(obj: any, path = "root"): { path: string; key: string }[] {
  const leaks: { path: string; key: string }[] = [];
  if (obj === null || typeof obj !== "object") return leaks;

  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      leaks.push(...deepScanForForbiddenKeys(item, `${path}[${idx}]`));
    });
    return leaks;
  }

  for (const [key, value] of Object.entries(obj)) {
    if (FORBIDDEN_PUBLIC_KEYS.includes(key)) {
      leaks.push({ path: `${path}.${key}`, key });
    }
    leaks.push(...deepScanForForbiddenKeys(value, `${path}.${key}`));
  }
  return leaks;
}

// --- Mocks ---
const mockDb = {
  from: vi.fn(),
};

vi.mock("../../apps/web/lib/supabase/client", () => ({
  createServiceClient: () => mockDb,
}));

vi.mock("../../../../lib/supabase/client", () => ({
  createServiceClient: () => mockDb,
}));

vi.mock("../../apps/web/lib/api/runtime-factory", () => ({
  createRuntimeComponents: () => ({
    workspaceId: "test-ws",
    adapter: { execute: vi.fn().mockResolvedValue({ output: { valid: "data", trace_payload: "SECRET_LEAK" } }) },
    traceWriter: { write: vi.fn() },
    usageWriter: { write: vi.fn() },
    runStore: { create: vi.fn(), update: vi.fn() },
  }),
  createGraphRuntimeComponents: () => ({
    workspaceId: "test-ws",
    adapter: { execute: vi.fn().mockResolvedValue({ output: { data: "graph", execution_plan: "SECRET_LEAK" } }) },
    graphTraceWriter: { write: vi.fn() },
    usageWriter: { write: vi.fn() },
    runStore: { create: vi.fn(), update: vi.fn() },
    graphRunStore: { create: vi.fn(), update: vi.fn() },
  }),
}));

vi.mock("../../../../lib/api/runtime-factory", () => ({
  createRuntimeComponents: () => ({
    workspaceId: "test-ws",
    adapter: { execute: vi.fn().mockResolvedValue({ output: { valid: "data", trace_payload: "SECRET_LEAK" } }) },
    traceWriter: { write: vi.fn() },
    usageWriter: { write: vi.fn() },
    runStore: { create: vi.fn(), update: vi.fn() },
  }),
  createGraphRuntimeComponents: () => ({
    workspaceId: "test-ws",
    adapter: { execute: vi.fn().mockResolvedValue({ output: { data: "graph", execution_plan: "SECRET_LEAK" } }) },
    graphTraceWriter: { write: vi.fn() },
    usageWriter: { write: vi.fn() },
    runStore: { create: vi.fn(), update: vi.fn() },
    graphRunStore: { create: vi.fn(), update: vi.fn() },
  }),
}));

describe("Public No-Leak Protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default chain mocks for Supabase client
    const createChain = (data: any) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
    });

    mockDb.from.mockImplementation((table: string) => {
      if (table === "apps") return createChain({
        id: "app-1", slug: "test-app", type: "casepack", casepack_key: "cp-1", visibility: "public",
        graph_key: "gr-1"
      });
      if (table === "casepacks") return createChain({ id: "cp-1" });
      if (table === "casepack_versions") return createChain({
        casepack_json: {
          key: "cp-1",
          version: "1",
          taskflow_cx: "SECRET_LEAK_1", // should be stripped!
          input_contract: { fields: [] },
          output_contract: { fields: [], public_fields: ["valid"] },
          runtime_contract: "SECRET_LEAK_2", // should be stripped!
          metadata: { nested: { trace_payload: "SECRET_LEAK_3" } } // Nested!
        }
      });
      if (table === "casepack_graphs") return createChain({ id: "gr-1", entry_node: "n1", final_nodes: ["n1"] });
      if (table === "graph_versions") return createChain({
        graph_json: {
          nodes: [{ id: "n1", casepack_key: "cp-1" }],
          edges: [],
          graph_json: "SECRET_LEAK_GRAPH", // should be stripped!
        }
      });
      if (table === "graph_runs") return createChain({
        id: "run-1",
        status: "success",
        final_output_json: {
          safe_data: "ok",
          deep: { K_REF: "SECRET_LEAK_KREF" } // Nested leak!
        }
      });
      return createChain(null);
    });
  });

  it("GET /api/public/apps/:slug does not leak", async () => {
    const req = new Request("http://localhost/api/public/apps/test-app");
    const res = await getAppContract(req, { params: Promise.resolve({ slug: "test-app" }) });
    const json = await res.json();
    
    const leaks = deepScanForForbiddenKeys(json);
    expect(leaks).toEqual([]);
  });

  it("POST /api/public/apps/:slug/run does not leak", async () => {
    const req = new Request("http://localhost/api/public/apps/test-app/run", {
      method: "POST",
      body: JSON.stringify({ input: {} }),
    });
    // For run, make sure app is casepack
    mockDb.from.mockImplementation((table: string) => {
      const createChain = (data: any) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
      });
      if (table === "apps") return createChain({ id: "app-1", slug: "test-app", type: "casepack", casepack_key: "cp-1", visibility: "public" });
      if (table === "casepacks") return createChain({ id: "cp-1" });
      if (table === "casepack_versions") return createChain({
        casepack_json: {
          input_contract: { fields: [] },
          output_contract: { fields: [], public_fields: ["valid"] },
        }
      });
      return createChain(null);
    });

    const res = await postAppRun(req, { params: Promise.resolve({ slug: "test-app" }) });
    const json = await res.json();
    
    const leaks = deepScanForForbiddenKeys(json);
    expect(leaks).toEqual([]);
  });

  it("POST /api/public/apps/:slug/graph-run does not leak", async () => {
    const req = new Request("http://localhost/api/public/apps/test-app/graph-run", {
      method: "POST",
      body: JSON.stringify({ input: {} }),
    });
    
    mockDb.from.mockImplementation((table: string) => {
      const createChain = (data: any) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
      });
      if (table === "apps") return createChain({ id: "app-1", slug: "test-app", type: "graph", graph_key: "gr-1", visibility: "public" });
      if (table === "casepack_graphs") return createChain({ id: "gr-1", entry_node: "n1", final_nodes: ["n1"] });
      if (table === "graph_versions") return createChain({ graph_json: { nodes: [{ id: "n1", casepack_key: "cp-1" }], edges: [] } });
      if (table === "casepacks") return createChain({ id: "cp-1" });
      if (table === "casepack_versions") return createChain({ casepack_json: { input_contract: { fields: [] }, output_contract: { fields: [] } } });
      return createChain(null);
    });

    const res = await postGraphRun(req, { params: Promise.resolve({ slug: "test-app" }) });
    const json = await res.json();
    
    const leaks = deepScanForForbiddenKeys(json);
    expect(leaks).toEqual([]);
  });

  it("GET /api/public/graph-runs/:id does not leak", async () => {
    const req = new Request("http://localhost/api/public/graph-runs/run-1");
    const res = await getGraphRun(req, { params: Promise.resolve({ id: "run-1" }) });
    const json = await res.json();
    
    const leaks = deepScanForForbiddenKeys(json);
    expect(leaks).toEqual([]);
  });

  it("deepSanitize works correctly on standalone object", () => {
    const badObj = {
      safe: "yes",
      trace_payload: "leak",
      nested: {
        safe2: "yes2",
        K_REF: "leak2",
        arr: [
          { execution_plan: "leak3", safe3: "yes3" }
        ]
      }
    };
    const clean = deepSanitize(badObj);
    const leaks = deepScanForForbiddenKeys(clean);
    expect(leaks).toEqual([]);
    expect((clean as any).safe).toBe("yes");
    expect((clean as any).nested.safe2).toBe("yes2");
    expect((clean as any).nested.arr[0].safe3).toBe("yes3");
  });
});
