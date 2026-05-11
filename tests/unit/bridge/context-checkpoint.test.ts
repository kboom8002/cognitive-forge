/**
 * tests/unit/bridge/context-checkpoint.test.ts
 *
 * Unit tests for buildContextCheckpoint.
 */

import { describe, it, expect } from "vitest";
import { buildContextCheckpoint } from "@cognitive-forge/bridge";

const SOURCE_OUTPUT = {
  company_overview:    "Acme Corp overview",
  target_audience:     "Mid-market execs",
  key_differentiators: "Speed and simplicity",
  internal_score:      "95",  // not mapped
};

const MAPPED_INPUT = {
  company_overview:    "Acme Corp overview",
  target_audience:     "Mid-market execs",
  key_differentiators: "Speed and simplicity",
};

describe("buildContextCheckpoint — full strategy", () => {
  it("preserves all source output fields", () => {
    const cp = buildContextCheckpoint("node_a", "node_b", SOURCE_OUTPUT, MAPPED_INPUT, "full");
    expect(cp.preserved_fields).toEqual(SOURCE_OUTPUT);
    expect(cp.strategy).toBe("full");
  });

  it("includes non-mapped source fields", () => {
    const cp = buildContextCheckpoint("node_a", "node_b", SOURCE_OUTPUT, MAPPED_INPUT, "full");
    expect(cp.preserved_fields).toHaveProperty("internal_score");
  });
});

describe("buildContextCheckpoint — partial strategy", () => {
  it("preserves only mapped fields", () => {
    const cp = buildContextCheckpoint("node_a", "node_b", SOURCE_OUTPUT, MAPPED_INPUT, "partial");
    expect(cp.preserved_fields).toEqual(MAPPED_INPUT);
    expect(cp.strategy).toBe("partial");
  });

  it("excludes non-mapped source fields", () => {
    const cp = buildContextCheckpoint("node_a", "node_b", SOURCE_OUTPUT, MAPPED_INPUT, "partial");
    expect(cp.preserved_fields).not.toHaveProperty("internal_score");
  });
});

describe("buildContextCheckpoint — none strategy", () => {
  it("preserves no fields", () => {
    const cp = buildContextCheckpoint("node_a", "node_b", SOURCE_OUTPUT, MAPPED_INPUT, "none");
    expect(cp.preserved_fields).toEqual({});
    expect(cp.strategy).toBe("none");
  });
});

describe("buildContextCheckpoint — metadata", () => {
  it("records correct source and target node IDs", () => {
    const cp = buildContextCheckpoint("intake", "positioning", SOURCE_OUTPUT, MAPPED_INPUT, "partial");
    expect(cp.source_node_id).toBe("intake");
    expect(cp.target_node_id).toBe("positioning");
  });

  it("created_at is a valid ISO-8601 timestamp", () => {
    const cp = buildContextCheckpoint("a", "b", SOURCE_OUTPUT, MAPPED_INPUT, "partial");
    expect(() => new Date(cp.created_at)).not.toThrow();
    expect(new Date(cp.created_at).toISOString()).toBe(cp.created_at);
  });

  it("returned checkpoint is frozen (immutable)", () => {
    const cp = buildContextCheckpoint("a", "b", SOURCE_OUTPUT, MAPPED_INPUT, "partial");
    expect(Object.isFrozen(cp)).toBe(true);
    expect(Object.isFrozen(cp.preserved_fields)).toBe(true);
  });
});
