/**
 * Phase C tests — composite schemas.
 *
 * Covers all 9 Phase C schemas with:
 * - Valid fixture assertions
 * - Cross-reference violation assertions (doc 05 rules)
 * - Task-card specific assertions (rules 1-7)
 */

import { describe, it, expect } from "vitest";

import {
  HandoffContractSchema,
  CasePackMAOSchema,
  BridgeCasePackSchema,
  CasePackGraphSchema,
  DomainPackManifestSchema,
  AppObjectSchema,
  ValidationReportSchema,
  RuntimeTraceEventSchema,
  UsageEventSchema,
} from "@cognitive-forge/core";

// ── Shared fixtures ───────────────────────────────────────────────────────────

const NOW = "2026-05-02T12:00:00Z";
const UUID = "550e8400-e29b-41d4-a716-446655440000";

const STRING_FIELD = { key: "company_name", type: "string", label: "Company Name" };
const TEXT_FIELD   = { key: "statement",    type: "text",   label: "Statement" };
const NUMBER_FIELD = { key: "word_count",   type: "number", label: "Word Count" };

const VALID_TASKFLOW = {
  R_role: "Senior communications strategist.",
  S_situation: "Public product recall crisis.",
  T_task: "Draft a public statement.",
  W_watchouts: "Do not admit liability. No jargon.",
  O_output_contract: "150-200 word formal statement.",
};

const VALID_INPUT_CONTRACT = {
  fields: [STRING_FIELD],
  required_fields: ["company_name"],
};

const VALID_OUTPUT_CONTRACT = {
  fields: [TEXT_FIELD, NUMBER_FIELD],
  required_fields: ["statement"],
  public_fields: ["statement"],
};

const VALID_RUNTIME = {
  execution_type: "single_casepack",
  provider: "openai",
  model: "gpt-4o",
};

const VALID_UI = { app_mode: "micro_app" };

// ── HandoffContractSchema ─────────────────────────────────────────────────────

describe("HandoffContractSchema", () => {
  const valid = {
    source_casepack_key: "casepack.pr_answer.v1",
    target_casepack_key: "casepack.pr_release.v1",
    fields: [STRING_FIELD],
    context_preservation: "partial",
  };

  it("accepts a valid HandoffContract", () => {
    expect(HandoffContractSchema.safeParse(valid).success).toBe(true);
  });

  it("defaults context_preservation to 'partial'", () => {
    const { context_preservation: _, ...noCtx } = valid;
    const result = HandoffContractSchema.safeParse(noCtx);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.context_preservation).toBe("partial");
  });

  it("REJECTS — empty fields array", () => {
    expect(HandoffContractSchema.safeParse({ ...valid, fields: [] }).success).toBe(false);
  });

  it("REJECTS — invalid source key format", () => {
    expect(HandoffContractSchema.safeParse({ ...valid, source_casepack_key: "bad.key" }).success).toBe(false);
  });

  it("REJECTS — unknown context_preservation value", () => {
    expect(HandoffContractSchema.safeParse({ ...valid, context_preservation: "selective" }).success).toBe(false);
  });
});

// ── CasePackMAOSchema (rule 1: atomic CasePack fixture must validate) ─────────

describe("CasePackMAOSchema", () => {
  const VALID_CASEPACK = {
    key: "casepack.pr_statement.v1",
    version: "1.0.0",
    status: "published",
    taskflow_cx: VALID_TASKFLOW,
    input_contract: VALID_INPUT_CONTRACT,
    output_contract: VALID_OUTPUT_CONTRACT,
    runtime_contract: VALID_RUNTIME,
    ui_schema: VALID_UI,
  };

  // RULE 1: Atomic CasePack fixture must validate
  it("RULE 1: valid atomic CasePack fixture validates", () => {
    const result = CasePackMAOSchema.safeParse(VALID_CASEPACK);
    expect(result.success).toBe(true);
  });

  it("accepts optional fields: policy_pack, evals, metadata", () => {
    const full = {
      ...VALID_CASEPACK,
      policy_pack: { max_tokens: 1024 },
      evals: [{ input: { company_name: "Acme" }, expected: { statement: "..." } }],
      metadata: { title: "PR Statement Generator", created_at: NOW },
    };
    expect(CasePackMAOSchema.safeParse(full).success).toBe(true);
  });

  it("REJECTS — invalid pack key format", () => {
    expect(CasePackMAOSchema.safeParse({ ...VALID_CASEPACK, key: "bad.key" }).success).toBe(false);
  });

  it("REJECTS — missing taskflow_cx", () => {
    const { taskflow_cx: _, ...no } = VALID_CASEPACK;
    expect(CasePackMAOSchema.safeParse(no).success).toBe(false);
  });

  it("REJECTS — taskflow_cx missing W_watchouts", () => {
    const result = CasePackMAOSchema.safeParse({
      ...VALID_CASEPACK,
      taskflow_cx: { ...VALID_TASKFLOW, W_watchouts: "" },
    });
    expect(result.success).toBe(false);
  });

  it("REJECTS — unknown status", () => {
    expect(CasePackMAOSchema.safeParse({ ...VALID_CASEPACK, status: "active" }).success).toBe(false);
  });
});

// ── BridgeCasePackSchema (rule 2: Bridge CasePack fixture must validate) ──────

describe("BridgeCasePackSchema", () => {
  const VALID_BRIDGE = {
    key: "bridge.pr_to_release.v1",
    version: "1.0.0",
    status: "published",
    source_casepack_key: "casepack.pr_answer.v1",
    target_casepack_key: "casepack.pr_release.v1",
    source_pattern: { statement: "string" },
    target_pattern: { release_text: "string" },
    mapping_rules: [{ source_field: "statement", target_field: "release_text" }],
    handoff_contract: {
      source_casepack_key: "casepack.pr_answer.v1",
      target_casepack_key: "casepack.pr_release.v1",
      fields: [TEXT_FIELD],
    },
  };

  // RULE 2: Bridge CasePack fixture must validate
  it("RULE 2: valid Bridge CasePack fixture validates", () => {
    const result = BridgeCasePackSchema.safeParse(VALID_BRIDGE);
    expect(result.success).toBe(true);
  });

  it("accepts optional default_values and context_checkpoint", () => {
    const full = {
      ...VALID_BRIDGE,
      default_values: { release_text: "Placeholder statement." },
      context_checkpoint: { session_id: "abc" },
    };
    expect(BridgeCasePackSchema.safeParse(full).success).toBe(true);
  });

  it("REJECTS — empty mapping_rules", () => {
    expect(BridgeCasePackSchema.safeParse({ ...VALID_BRIDGE, mapping_rules: [] }).success).toBe(false);
  });

  it("REJECTS — invalid bridge key format", () => {
    expect(BridgeCasePackSchema.safeParse({ ...VALID_BRIDGE, key: "casepack.foo.v1" }).success).toBe(false);
  });

  it("REJECTS — missing handoff_contract", () => {
    const { handoff_contract: _, ...no } = VALID_BRIDGE;
    expect(BridgeCasePackSchema.safeParse(no).success).toBe(false);
  });
});

// ── CasePackGraphSchema ───────────────────────────────────────────────────────

describe("CasePackGraphSchema", () => {
  const VALID_GRAPH = {
    key: "graph.corporate_pr_suite.v1",
    version: "1.0.0",
    status: "published",
    nodes: [
      { id: "pr_answer",  casepack_key: "casepack.pr_answer.v1",  label: "PR Answer"  },
      { id: "pr_release", casepack_key: "casepack.pr_release.v1", label: "PR Release" },
    ],
    edges: [{ from: "pr_answer", to: "pr_release", bridge_key: "bridge.pr_to_release.v1" }],
    entry_node:  "pr_answer",
    final_nodes: ["pr_release"],
  };

  it("accepts a valid CasePackGraph", () => {
    expect(CasePackGraphSchema.safeParse(VALID_GRAPH).success).toBe(true);
  });

  // RULE 3: Graph with missing entry_node must fail
  it("RULE 3: REJECTS — entry_node references non-existent node", () => {
    const result = CasePackGraphSchema.safeParse({
      ...VALID_GRAPH,
      entry_node: "ghost_node",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("ghost_node");
      expect(result.error.issues[0].path).toContain("entry_node");
    }
  });

  it("REJECTS — final_nodes references non-existent node", () => {
    const result = CasePackGraphSchema.safeParse({
      ...VALID_GRAPH,
      final_nodes: ["pr_release", "phantom_node"],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("phantom_node");
    }
  });

  it("REJECTS — edge.from references non-existent node", () => {
    const result = CasePackGraphSchema.safeParse({
      ...VALID_GRAPH,
      edges: [{ from: "missing_node", to: "pr_release" }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("missing_node");
    }
  });

  it("REJECTS — empty nodes", () => {
    expect(CasePackGraphSchema.safeParse({ ...VALID_GRAPH, nodes: [] }).success).toBe(false);
  });

  it("REJECTS — invalid graph key format", () => {
    expect(CasePackGraphSchema.safeParse({ ...VALID_GRAPH, key: "pack.foo.v1" }).success).toBe(false);
  });

  it("REJECTS — node id not snake_case", () => {
    const result = CasePackGraphSchema.safeParse({
      ...VALID_GRAPH,
      nodes: [{ id: "PrAnswer", casepack_key: "casepack.pr_answer.v1" }, ...VALID_GRAPH.nodes.slice(1)],
    });
    expect(result.success).toBe(false);
  });
});

// ── DomainPackManifestSchema ──────────────────────────────────────────────────

describe("DomainPackManifestSchema", () => {
  const VALID_MANIFEST = {
    key: "pack.corporate_pr.v1",
    version: "1.0.0",
    status: "published",
    primary_app_slug: "corporate-pr-suite",
    assets: {
      apps: [{ slug: "corporate-pr-suite", casepack_key: "casepack.pr_statement.v1", title: "Corporate PR Suite" }],
      casepacks: ["casepack.pr_statement.v1"],
    },
  };

  it("accepts a valid DomainPackManifest", () => {
    expect(DomainPackManifestSchema.safeParse(VALID_MANIFEST).success).toBe(true);
  });

  // RULE 4: Pack manifest with invalid primary_app_slug must fail
  it("RULE 4: REJECTS — primary_app_slug not in assets.apps", () => {
    const result = DomainPackManifestSchema.safeParse({
      ...VALID_MANIFEST,
      primary_app_slug: "nonexistent-app",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("nonexistent-app");
      expect(result.error.issues[0].path).toContain("primary_app_slug");
    }
  });

  it("REJECTS — empty assets.apps", () => {
    expect(DomainPackManifestSchema.safeParse({ ...VALID_MANIFEST, assets: { ...VALID_MANIFEST.assets, apps: [] } }).success).toBe(false);
  });

  it("REJECTS — invalid pack key format", () => {
    expect(DomainPackManifestSchema.safeParse({ ...VALID_MANIFEST, key: "casepack.foo.v1" }).success).toBe(false);
  });

  it("REJECTS — invalid primary_app_slug format (uppercase)", () => {
    // Even if we change assets.apps to match, slug format itself is invalid
    expect(DomainPackManifestSchema.safeParse({
      ...VALID_MANIFEST,
      primary_app_slug: "Corporate_PR",
      assets: { ...VALID_MANIFEST.assets, apps: [{ slug: "Corporate_PR" }] },
    }).success).toBe(false);
  });
});

// ── AppObjectSchema ───────────────────────────────────────────────────────────

describe("AppObjectSchema", () => {
  const CASEPACK_APP = {
    slug: "corporate-pr-suite",
    title: "Corporate PR Suite",
    type: "casepack",
    casepack_key: "casepack.pr_statement.v1",
    visibility: "workspace",
  };

  const GRAPH_APP = {
    slug: "full-pr-workflow",
    title: "Full PR Workflow",
    type: "graph",
    graph_key: "graph.corporate_pr_suite.v1",
    visibility: "public",
  };

  it("accepts a valid casepack app", () => {
    expect(AppObjectSchema.safeParse(CASEPACK_APP).success).toBe(true);
  });

  it("accepts a valid graph app", () => {
    expect(AppObjectSchema.safeParse(GRAPH_APP).success).toBe(true);
  });

  // RULE 5: App graph object without graph_key must fail
  it("RULE 5: REJECTS — type 'graph' without graph_key", () => {
    const result = AppObjectSchema.safeParse({
      slug: "full-pr-workflow",
      title: "Full PR Workflow",
      type: "graph",
      visibility: "public",
      // graph_key intentionally omitted
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("graph_key");
    }
  });

  it("REJECTS — type 'casepack' without casepack_key", () => {
    const result = AppObjectSchema.safeParse({
      slug: "pr-suite",
      title: "PR Suite",
      type: "casepack",
      visibility: "workspace",
    });
    expect(result.success).toBe(false);
  });

  it("REJECTS — type 'casepack' with graph_key set (XOR violation)", () => {
    const result = AppObjectSchema.safeParse({
      ...CASEPACK_APP,
      graph_key: "graph.corporate_pr_suite.v1",
    });
    expect(result.success).toBe(false);
  });

  it("REJECTS — type 'graph' with casepack_key set (XOR violation)", () => {
    const result = AppObjectSchema.safeParse({
      ...GRAPH_APP,
      casepack_key: "casepack.pr_statement.v1",
    });
    expect(result.success).toBe(false);
  });

  it("REJECTS — invalid slug format", () => {
    expect(AppObjectSchema.safeParse({ ...CASEPACK_APP, slug: "Corporate_PR" }).success).toBe(false);
  });

  it("REJECTS — unknown visibility level", () => {
    expect(AppObjectSchema.safeParse({ ...CASEPACK_APP, visibility: "restricted" }).success).toBe(false);
  });
});

// ── ValidationReportSchema ────────────────────────────────────────────────────

describe("ValidationReportSchema", () => {
  const PASSING = {
    valid: true,
    status: "pass",
    errors: [],
    checked_at: NOW,
  };

  const FAILING = {
    valid: false,
    status: "fail",
    errors: [{ code: "MISSING_FIELD", message: "statement is required", blocking: true }],
    checked_at: NOW,
  };

  it("accepts a passing report", () => {
    expect(ValidationReportSchema.safeParse(PASSING).success).toBe(true);
  });

  it("accepts a failing report with blocking errors", () => {
    expect(ValidationReportSchema.safeParse(FAILING).success).toBe(true);
  });

  it("accepts a warning report", () => {
    expect(ValidationReportSchema.safeParse({
      valid: true,
      status: "warning",
      errors: [{ code: "LOW_CONFIDENCE", message: "Output confidence is below threshold", blocking: false }],
      warnings: ["Model temperature was high — output may be creative."],
      checked_at: NOW,
    }).success).toBe(true);
  });

  // RULE 6: ValidationReport with blocking errors and status "pass" must fail
  it("RULE 6: REJECTS — blocking errors but status is 'pass'", () => {
    const result = ValidationReportSchema.safeParse({
      valid: false,
      status: "pass",   // WRONG — should be "fail"
      errors: [{ code: "MISSING_FIELD", message: "statement required", blocking: true }],
      checked_at: NOW,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("blocking errors");
    }
  });

  it("REJECTS — valid:false but status 'pass'", () => {
    const result = ValidationReportSchema.safeParse({
      valid: false,
      status: "pass",
      errors: [],
      checked_at: NOW,
    });
    expect(result.success).toBe(false);
  });

  it("REJECTS — valid:true but status 'fail'", () => {
    const result = ValidationReportSchema.safeParse({
      valid: true,
      status: "fail",
      errors: [],
      checked_at: NOW,
    });
    expect(result.success).toBe(false);
  });

  it("REJECTS — invalid checked_at format", () => {
    expect(ValidationReportSchema.safeParse({ ...PASSING, checked_at: "2026-05-02" }).success).toBe(false);
  });

  it("defaults error.blocking to true", () => {
    const result = ValidationReportSchema.safeParse({
      ...FAILING,
      errors: [{ code: "E", message: "error" }], // no blocking field
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.errors[0].blocking).toBe(true);
    }
  });
});

// ── RuntimeTraceEventSchema ───────────────────────────────────────────────────

describe("RuntimeTraceEventSchema", () => {
  const VALID_TRACE = {
    run_id: UUID,
    event_type: "output",
    casepack_key: "casepack.pr_statement.v1",
    payload: { raw_output: "Statement drafted." },
    sequence: 3,
    created_at: NOW,
  };

  it("accepts a valid trace event", () => {
    expect(RuntimeTraceEventSchema.safeParse(VALID_TRACE).success).toBe(true);
  });

  it("accepts all event types", () => {
    const types = ["start", "step", "output", "repair", "fallback", "complete", "error"];
    for (const event_type of types) {
      expect(RuntimeTraceEventSchema.safeParse({ ...VALID_TRACE, event_type }).success).toBe(true);
    }
  });

  it("REJECTS — unknown event type", () => {
    expect(RuntimeTraceEventSchema.safeParse({ ...VALID_TRACE, event_type: "pause" }).success).toBe(false);
  });

  it("REJECTS — invalid run_id (not UUID)", () => {
    expect(RuntimeTraceEventSchema.safeParse({ ...VALID_TRACE, run_id: "not-a-uuid" }).success).toBe(false);
  });

  it("REJECTS — missing payload", () => {
    const { payload: _, ...noPayload } = VALID_TRACE;
    expect(RuntimeTraceEventSchema.safeParse(noPayload).success).toBe(false);
  });

  it("REJECTS — negative sequence", () => {
    expect(RuntimeTraceEventSchema.safeParse({ ...VALID_TRACE, sequence: -1 }).success).toBe(false);
  });
});

// ── UsageEventSchema ──────────────────────────────────────────────────────────

describe("UsageEventSchema", () => {
  const VALID_USAGE = {
    run_id: UUID,
    workspace_id: UUID,
    casepack_key: "casepack.pr_statement.v1",
    provider: "openai",
    model: "gpt-4o",
    tokens_in: 450,
    tokens_out: 220,
    cost_usd: 0.0067,
    repair_attempts: 0,
    created_at: NOW,
  };

  it("accepts a valid UsageEvent", () => {
    expect(UsageEventSchema.safeParse(VALID_USAGE).success).toBe(true);
  });

  it("accepts optional cost_usd being absent", () => {
    const { cost_usd: _, ...noCost } = VALID_USAGE;
    expect(UsageEventSchema.safeParse(noCost).success).toBe(true);
  });

  it("defaults repair_attempts to 0", () => {
    const { repair_attempts: _, ...noRepair } = VALID_USAGE;
    const result = UsageEventSchema.safeParse(noRepair);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.repair_attempts).toBe(0);
  });

  it("REJECTS — negative tokens_in", () => {
    expect(UsageEventSchema.safeParse({ ...VALID_USAGE, tokens_in: -1 }).success).toBe(false);
  });

  it("REJECTS — unknown provider", () => {
    expect(UsageEventSchema.safeParse({ ...VALID_USAGE, provider: "cohere" }).success).toBe(false);
  });

  it("REJECTS — invalid workspace_id (not UUID)", () => {
    expect(UsageEventSchema.safeParse({ ...VALID_USAGE, workspace_id: "not-a-uuid" }).success).toBe(false);
  });

  it("REJECTS — negative cost_usd", () => {
    expect(UsageEventSchema.safeParse({ ...VALID_USAGE, cost_usd: -0.01 }).success).toBe(false);
  });
});
