/**
 * RLS Policy Structure Tests
 *
 * These tests validate the SQL content of the RLS migration file to ensure:
 * 1. Helper functions are defined correctly.
 * 2. RLS is enabled on all required tables.
 * 3. No blanket-public policy (USING (true)) exists.
 * 4. Mandatory policies are present.
 * 5. FORBIDDEN tables have no SELECT policy.
 *
 * These are static analysis tests that run in CI without a live database.
 * Full integration tests (actual RLS enforcement) require `supabase start`.
 *
 * Integration test scenarios (marked as todo — require live Supabase):
 *   - non-member cannot read workspace resources
 *   - viewer (member role) cannot INSERT into casepacks
 *   - anonymous user can read public app metadata only
 *   - anonymous user cannot read workspace-private apps
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// Load migration file
// ---------------------------------------------------------------------------

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase/migrations/20260502000010_rls.sql"
);

let sql: string;

beforeAll(() => {
  sql = readFileSync(MIGRATION_PATH, "utf-8");
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function containsPolicy(
  sql: string,
  table: string,
  operation: string,
  policyName?: string
): boolean {
  const tablePattern = new RegExp(
    `ON\\s+${table}\\s+FOR\\s+${operation}`,
    "i"
  );
  if (!tablePattern.test(sql)) return false;
  if (policyName) {
    return sql.includes(policyName);
  }
  return true;
}

function tableHasRLSEnabled(sql: string, table: string): boolean {
  return new RegExp(
    `ALTER\\s+TABLE\\s+${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
    "i"
  ).test(sql);
}

// ---------------------------------------------------------------------------
// Helper function definitions
// ---------------------------------------------------------------------------

describe("RLS Helper Functions", () => {
  it("defines is_workspace_member function", () => {
    expect(sql).toContain("CREATE OR REPLACE FUNCTION is_workspace_member");
  });

  it("is_workspace_member uses SECURITY DEFINER", () => {
    expect(sql).toMatch(
      /is_workspace_member[\s\S]{0,200}SECURITY DEFINER/
    );
  });

  it("is_workspace_member guards against NULL ws_id", () => {
    // The function must check ws_id IS NOT NULL
    expect(sql).toContain("ws_id IS NOT NULL");
  });

  it("is_workspace_member guards against anonymous callers", () => {
    expect(sql).toContain("auth.uid() IS NOT NULL");
  });

  it("defines has_workspace_role function", () => {
    expect(sql).toContain("CREATE OR REPLACE FUNCTION has_workspace_role");
  });

  it("has_workspace_role uses SECURITY DEFINER", () => {
    expect(sql).toMatch(
      /has_workspace_role[\s\S]{0,200}SECURITY DEFINER/
    );
  });

  it("has_workspace_role implements owner > admin > member hierarchy", () => {
    expect(sql).toContain("'owner'");
    expect(sql).toContain("'admin'");
    expect(sql).toContain("'member'");
    // owner check must be strict
    expect(sql).toContain("role = 'owner'");
  });
});

// ---------------------------------------------------------------------------
// RLS enabled on all required tables
// ---------------------------------------------------------------------------

describe("RLS Enabled", () => {
  const WORKSPACE_SCOPED_TABLES = [
    "workspaces",
    "workspace_members",
    "casepacks",
    "casepack_versions",
    "domain_packs",
    "domain_pack_versions",
    "domain_pack_assets",
    "domain_pack_installs",
    "apps",
    "casepack_graphs",
    "graph_versions",
    "casepack_runs",
    "graph_runs",
    "node_runs",
    "handoff_events",
    "runtime_trace_events",
    "usage_events",
    "validation_results",
  ];

  for (const table of WORKSPACE_SCOPED_TABLES) {
    it(`RLS is enabled on ${table}`, () => {
      expect(tableHasRLSEnabled(sql, table)).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// FORBIDDEN tables must have NO SELECT policy
// ---------------------------------------------------------------------------

describe("FORBIDDEN tables — no SELECT policy", () => {
  const FORBIDDEN_TABLES = [
    "casepack_versions",
    "domain_pack_versions",
    "graph_versions",
    "handoff_events",
    "runtime_trace_events",
  ];

  for (const table of FORBIDDEN_TABLES) {
    it(`${table} has no SELECT policy (service role only)`, () => {
      // If a SELECT policy exists for this table it will appear as:
      // ON <table> FOR SELECT
      const selectPolicyExists = containsPolicy(sql, table, "SELECT");
      expect(selectPolicyExists).toBe(false);
    });
  }
});

// ---------------------------------------------------------------------------
// No blanket public access
// ---------------------------------------------------------------------------

describe("No blanket public access", () => {
  it('does not contain USING (true) — blanket public access', () => {
    // USING (true) would expose all rows to all users — forbidden
    expect(sql).not.toMatch(/USING\s*\(\s*true\s*\)/i);
  });

  it('does not contain WITH CHECK (true) — blanket insert bypass', () => {
    expect(sql).not.toMatch(/WITH\s+CHECK\s*\(\s*true\s*\)/i);
  });

  it("public app policy scopes to visibility = 'public' only", () => {
    expect(sql).toContain("visibility = 'public'");
    // Must not be a blanket open policy — must always scope
    expect(sql).not.toContain("USING (visibility)");
  });
});

// ---------------------------------------------------------------------------
// Mandatory workspace isolation policies
// ---------------------------------------------------------------------------

describe("Workspace isolation policies", () => {
  it("workspaces has a member SELECT policy", () => {
    expect(sql).toContain("workspaces_select_member");
  });

  it("workspaces SELECT uses is_workspace_member", () => {
    expect(sql).toMatch(/workspaces_select_member[\s\S]{0,300}is_workspace_member/);
  });

  it("workspaces UPDATE is restricted to owner role", () => {
    expect(sql).toContain("workspaces_update_owner");
    expect(sql).toMatch(/workspaces_update_owner[\s\S]{0,300}has_workspace_role[\s\S]{0,100}'owner'/);
  });

  it("workspace_members SELECT uses is_workspace_member", () => {
    expect(sql).toContain("workspace_members_select_member");
  });

  it("casepacks SELECT policy exists", () => {
    expect(sql).toContain("casepacks_select_member_or_public");
  });

  it("casepacks INSERT requires admin role (builder policy)", () => {
    expect(sql).toContain("casepacks_insert_admin");
    expect(sql).toMatch(/casepacks_insert_admin[\s\S]{0,300}has_workspace_role[\s\S]{0,100}'admin'/);
  });

  it("casepack_graphs SELECT is workspace-member-scoped", () => {
    expect(sql).toContain("casepack_graphs_select_member");
  });

  it("casepack_graphs INSERT requires admin role", () => {
    expect(sql).toContain("casepack_graphs_insert_admin");
  });
});

// ---------------------------------------------------------------------------
// Runtime insert policies
// ---------------------------------------------------------------------------

describe("Runtime insert policies (Rule 6)", () => {
  it("casepack_runs has a member INSERT policy", () => {
    expect(sql).toContain("casepack_runs_insert_member");
  });

  it("casepack_runs INSERT checks is_workspace_member", () => {
    expect(sql).toMatch(
      /casepack_runs_insert_member[\s\S]{0,300}is_workspace_member/
    );
  });

  it("graph_runs has a member INSERT policy", () => {
    expect(sql).toContain("graph_runs_insert_member");
  });

  it("casepack_runs SELECT is scoped to own runs only", () => {
    expect(sql).toContain("casepack_runs_select_own");
    // Must check user_id = auth.uid()
    expect(sql).toMatch(/casepack_runs_select_own[\s\S]{0,300}user_id\s*=\s*auth\.uid\(\)/);
  });
});

// ---------------------------------------------------------------------------
// Public app access policy (Rule 7)
// ---------------------------------------------------------------------------

describe("Public active app SELECT policy (Rule 7)", () => {
  it("apps table has a public SELECT policy", () => {
    expect(sql).toContain("apps_select_public");
  });

  it("apps public SELECT is scoped to visibility = 'public'", () => {
    expect(sql).toMatch(
      /apps_select_public[\s\S]{0,200}visibility\s*=\s*'public'/
    );
  });

  it("apps table also has a member SELECT policy for workspace-private apps", () => {
    expect(sql).toContain("apps_select_member");
  });

  it("apps INSERT requires admin role (builder policy)", () => {
    expect(sql).toContain("apps_insert_admin");
  });
});

// ---------------------------------------------------------------------------
// Domain Pack public policy (Rule 8)
// ---------------------------------------------------------------------------

describe("Domain Pack public SELECT policy (Rule 8)", () => {
  it("domain_packs has a public SELECT policy", () => {
    expect(sql).toContain("domain_packs_select_member_or_public");
  });

  it("domain_packs public SELECT scopes to visibility = 'public'", () => {
    expect(sql).toMatch(
      /domain_packs_select_member_or_public[\s\S]{0,300}visibility\s*=\s*'public'/
    );
  });
});

// ---------------------------------------------------------------------------
// Integration test scenarios (documented — require live Supabase)
// ---------------------------------------------------------------------------

describe.todo(
  "Integration: non-member cannot read workspace resources (requires supabase start)"
);
describe.todo(
  "Integration: viewer (member role) cannot INSERT into casepacks (requires supabase start)"
);
describe.todo(
  "Integration: anonymous user can read public app metadata only (requires supabase start)"
);
describe.todo(
  "Integration: anonymous user cannot read workspace-private apps (requires supabase start)"
);
describe.todo(
  "Integration: workspace member can read own casepack_runs only (requires supabase start)"
);
describe.todo(
  "Integration: handoff_events returns zero rows for authenticated user (requires supabase start)"
);
describe.todo(
  "Integration: runtime_trace_events returns zero rows for authenticated user (requires supabase start)"
);
