/**
 * tests/unit/runtime/retention-policy.test.ts
 */

import { describe, it, expect } from "vitest";
import { RETENTION_DAYS, isRetained, shouldPersist } from "@cognitive-forge/runtime";

describe("RetentionPolicy", () => {
  it("RETENTION_DAYS is 90", () => {
    expect(RETENTION_DAYS).toBe(90);
  });

  it("isRetained returns true for a timestamp from today", () => {
    const now = new Date().toISOString();
    expect(isRetained(now)).toBe(true);
  });

  it("isRetained returns true for a timestamp from 89 days ago", () => {
    const eightNine = Date.now() - 89 * 24 * 60 * 60 * 1000;
    expect(isRetained(new Date(eightNine).toISOString())).toBe(true);
  });

  it("isRetained returns false for a timestamp from 91 days ago", () => {
    const ninetyOne = Date.now() - 91 * 24 * 60 * 60 * 1000;
    expect(isRetained(new Date(ninetyOne).toISOString())).toBe(false);
  });

  it("isRetained returns false for invalid date string", () => {
    expect(isRetained("not-a-date")).toBe(false);
  });

  it("isRetained respects custom retentionDays", () => {
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
    expect(isRetained(new Date(twoDaysAgo).toISOString(), 1)).toBe(false);
    expect(isRetained(new Date(twoDaysAgo).toISOString(), 3)).toBe(true);
  });

  it("shouldPersist returns true when zeroRetention is false", () => {
    expect(shouldPersist(false)).toBe(true);
  });

  it("shouldPersist returns false when zeroRetention is true", () => {
    expect(shouldPersist(true)).toBe(false);
  });
});
