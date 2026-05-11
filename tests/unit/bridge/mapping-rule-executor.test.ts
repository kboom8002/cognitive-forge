/**
 * tests/unit/bridge/mapping-rule-executor.test.ts
 *
 * Unit tests for executeMappingRules.
 * Uses the P0 fixture bridge structure for realistic test cases.
 */

import { describe, it, expect } from "vitest";
import { executeMappingRules } from "@cognitive-forge/bridge";
import type { BridgeCasePack } from "@cognitive-forge/core";

// ── Minimal BridgeCasePack fixture (mirrors corporate-pr intake→positioning) ──

const INTAKE_TO_POSITIONING: BridgeCasePack = {
  key:                 "bridge.intake_to_positioning.v1",
  version:             "1.0.0",
  status:              "published",
  source_casepack_key: "casepack.company_intake.v1",
  target_casepack_key: "casepack.brand_positioning.v1",
  source_pattern: {
    company_overview:    "string",
    target_audience:     "string",
    key_differentiators: "string",
  },
  target_pattern: {
    company_overview:    "string",
    target_audience:     "string",
    key_differentiators: "string",
  },
  mapping_rules: [
    { source_field: "company_overview",    target_field: "company_overview"    },
    { source_field: "target_audience",     target_field: "target_audience"     },
    { source_field: "key_differentiators", target_field: "key_differentiators" },
  ],
  handoff_contract: {
    source_casepack_key: "casepack.company_intake.v1",
    target_casepack_key: "casepack.brand_positioning.v1",
    fields: [
      { key: "company_overview",    type: "text", label: "Company Overview"    },
      { key: "target_audience",     type: "text", label: "Target Audience"     },
      { key: "key_differentiators", type: "text", label: "Key Differentiators" },
    ],
    context_preservation: "partial",
  },
};

// Bridge with rename (different source→target keys)
const RENAME_BRIDGE: BridgeCasePack = {
  key:                 "bridge.rename_test.v1",
  version:             "1.0.0",
  status:              "published",
  source_casepack_key: "casepack.a.v1",
  target_casepack_key: "casepack.b.v1",
  source_pattern: { old_name: "string" },
  target_pattern: { new_name: "string" },
  mapping_rules: [
    { source_field: "old_name", target_field: "new_name" },
  ],
  handoff_contract: {
    source_casepack_key: "casepack.a.v1",
    target_casepack_key: "casepack.b.v1",
    fields: [{ key: "new_name", type: "text", label: "New Name" }],
    context_preservation: "partial",
  },
};

// Bridge with transform expressions
const TRANSFORM_BRIDGE: BridgeCasePack = {
  key:                 "bridge.transform_test.v1",
  version:             "1.0.0",
  status:              "published",
  source_casepack_key: "casepack.a.v1",
  target_casepack_key: "casepack.b.v1",
  source_pattern: { raw_text: "string", description: "string" },
  target_pattern: { trimmed: "string", summary: "string" },
  mapping_rules: [
    { source_field: "raw_text",    target_field: "trimmed", transform: "trim"      },
    { source_field: "description", target_field: "summary", transform: "summarize" },
  ],
  handoff_contract: {
    source_casepack_key: "casepack.a.v1",
    target_casepack_key: "casepack.b.v1",
    fields: [
      { key: "trimmed", type: "text", label: "Trimmed" },
      { key: "summary", type: "text", label: "Summary" },
    ],
    context_preservation: "partial",
  },
};

// Bridge with default_values
const DEFAULT_VALUES_BRIDGE: BridgeCasePack = {
  key:                 "bridge.defaults_test.v1",
  version:             "1.0.0",
  status:              "published",
  source_casepack_key: "casepack.a.v1",
  target_casepack_key: "casepack.b.v1",
  source_pattern: { provided: "string" },
  target_pattern: { provided: "string", fallback_field: "string" },
  mapping_rules: [
    { source_field: "provided", target_field: "provided" },
  ],
  default_values: { fallback_field: "Default Value" },
  handoff_contract: {
    source_casepack_key: "casepack.a.v1",
    target_casepack_key: "casepack.b.v1",
    fields: [
      { key: "provided",       type: "text", label: "Provided"      },
      { key: "fallback_field", type: "text", label: "Fallback Field" },
    ],
    context_preservation: "partial",
  },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("executeMappingRules — direct field mapping (P0 pattern)", () => {
  const SOURCE = {
    company_overview:    "Acme Corp",
    target_audience:     "Mid-market execs",
    key_differentiators: "Speed",
  };

  it("maps all declared fields to target", () => {
    const result = executeMappingRules(SOURCE, INTAKE_TO_POSITIONING);
    expect(result.mapped.company_overview).toBe("Acme Corp");
    expect(result.mapped.target_audience).toBe("Mid-market execs");
    expect(result.mapped.key_differentiators).toBe("Speed");
  });

  it("returns empty unmapped_source when all source fields are referenced", () => {
    const result = executeMappingRules(SOURCE, INTAKE_TO_POSITIONING);
    expect(result.unmapped_source).toHaveLength(0);
  });

  it("returns empty missing_target when all target fields are mapped", () => {
    const result = executeMappingRules(SOURCE, INTAKE_TO_POSITIONING);
    expect(result.missing_target).toHaveLength(0);
  });

  it("does NOT pass unmapped source fields to target (allow-list)", () => {
    const sourceWithExtra = {
      ...SOURCE,
      internal_secret: "do not pass me",
    };
    const result = executeMappingRules(sourceWithExtra, INTAKE_TO_POSITIONING);
    expect(result.mapped).not.toHaveProperty("internal_secret");
  });
});

describe("executeMappingRules — rename (different source→target keys)", () => {
  it("maps source_field to a differently-named target_field", () => {
    const result = executeMappingRules({ old_name: "Alice" }, RENAME_BRIDGE);
    expect(result.mapped.new_name).toBe("Alice");
    expect(result.mapped).not.toHaveProperty("old_name");
  });
});

describe("executeMappingRules — with transforms", () => {
  it("applies trim transform", () => {
    const source = { raw_text: "  hello  ", description: "desc" };
    const result = executeMappingRules(source, TRANSFORM_BRIDGE);
    expect(result.mapped.trimmed).toBe("hello");
  });

  it("applies summarize transform for long text", () => {
    const longDesc = "word ".repeat(100);
    const source = { raw_text: "text", description: longDesc };
    const result = executeMappingRules(source, TRANSFORM_BRIDGE);
    expect((result.mapped.summary as string).endsWith("...")).toBe(true);
    expect((result.mapped.summary as string).length).toBeLessThanOrEqual(283);
  });
});

describe("executeMappingRules — default_values", () => {
  it("fills missing target field from default_values", () => {
    const source = { provided: "hello" };
    const result = executeMappingRules(source, DEFAULT_VALUES_BRIDGE);
    expect(result.mapped.provided).toBe("hello");
    expect(result.mapped.fallback_field).toBe("Default Value");
  });

  it("does NOT override an already-mapped value with default", () => {
    const bridge: BridgeCasePack = {
      ...DEFAULT_VALUES_BRIDGE,
      mapping_rules: [
        { source_field: "provided",      target_field: "provided"      },
        { source_field: "fallback_field_src", target_field: "fallback_field" },
      ],
    };
    const source = { provided: "hello", fallback_field_src: "from mapping" };
    const result = executeMappingRules(source, bridge);
    // The mapped value takes priority over default
    expect(result.mapped.fallback_field).toBe("from mapping");
  });
});

describe("executeMappingRules — missing source fields", () => {
  it("maps undefined when source field is missing", () => {
    const result = executeMappingRules({}, INTAKE_TO_POSITIONING);
    expect(result.mapped.company_overview).toBeUndefined();
  });

  it("reports unmapped_source for extra source fields", () => {
    const source = {
      company_overview:    "Acme",
      target_audience:     "Execs",
      key_differentiators: "Speed",
      extra_field:         "not in pattern",
    };
    const result = executeMappingRules(source, INTAKE_TO_POSITIONING);
    expect(result.unmapped_source).toContain("extra_field");
  });

  it("reports missing_target when a target field has no value after mapping", () => {
    const result = executeMappingRules({ company_overview: "Acme" }, INTAKE_TO_POSITIONING);
    expect(result.missing_target).toContain("target_audience");
    expect(result.missing_target).toContain("key_differentiators");
  });
});
