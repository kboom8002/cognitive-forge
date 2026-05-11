/**
 * Phase A tests — common types, primitives, constants, and utils.
 *
 * Tests for:
 * - JSON type schemas (JsonValueSchema, JsonObjectSchema)
 * - Scalar primitive schemas (UUID, ISODateTime, Slug, SemVer, keys)
 * - Status / classification enum schemas
 * - AppError class
 * - safeParseOrThrow / safeParse helpers
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";

import {
  // Schemas
  UUIDSchema,
  ISODateTimeSchema,
  SlugSchema,
  SemVerSchema,
  PackKeySchema,
  CasePackKeySchema,
  BridgeKeySchema,
  JsonValueSchema,
  JsonObjectSchema,
  RunStatusSchema,
  PackStatusSchema,
  VisibilityLevelSchema,
  AppTypeSchema,
  AIProviderSchema,
  // Constants
  RUN_STATUS,
  PACK_STATUS,
  VISIBILITY_LEVEL,
  APP_TYPE,
  AI_PROVIDER,
  // Error
  AppError,
  AppErrorCode,
  // Utils
  safeParseOrThrow,
  safeParse,
} from "@cognitive-forge/core";

// ── UUIDSchema ───────────────────────────────────────────────────────────────

describe("UUIDSchema", () => {
  it("accepts a valid v4 UUID", () => {
    expect(UUIDSchema.safeParse("550e8400-e29b-41d4-a716-446655440000").success).toBe(true);
  });

  it("rejects a non-UUID string", () => {
    expect(UUIDSchema.safeParse("not-a-uuid").success).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(UUIDSchema.safeParse("").success).toBe(false);
  });
});

// ── ISODateTimeSchema ────────────────────────────────────────────────────────

describe("ISODateTimeSchema", () => {
  it("accepts a UTC datetime", () => {
    expect(ISODateTimeSchema.safeParse("2026-05-02T12:00:00Z").success).toBe(true);
  });

  it("accepts a datetime with +09:00 offset", () => {
    expect(ISODateTimeSchema.safeParse("2026-05-02T12:00:00+09:00").success).toBe(true);
  });

  it("rejects a date-only string", () => {
    expect(ISODateTimeSchema.safeParse("2026-05-02").success).toBe(false);
  });

  it("rejects a plain timestamp number", () => {
    expect(ISODateTimeSchema.safeParse(1714651200000).success).toBe(false);
  });
});

// ── SlugSchema ───────────────────────────────────────────────────────────────

describe("SlugSchema", () => {
  it("accepts valid slugs", () => {
    expect(SlugSchema.safeParse("corporate-pr-suite").success).toBe(true);
    expect(SlugSchema.safeParse("book-to-agent").success).toBe(true);
    expect(SlugSchema.safeParse("abc123").success).toBe(true);
  });

  it("rejects uppercase letters", () => {
    expect(SlugSchema.safeParse("Corporate-PR").success).toBe(false);
  });

  it("rejects leading/trailing hyphens", () => {
    expect(SlugSchema.safeParse("-bad-slug").success).toBe(false);
    expect(SlugSchema.safeParse("bad-slug-").success).toBe(false);
  });

  it("rejects double hyphens", () => {
    expect(SlugSchema.safeParse("bad--slug").success).toBe(false);
  });

  it("rejects empty string", () => {
    expect(SlugSchema.safeParse("").success).toBe(false);
  });
});

// ── SemVerSchema ─────────────────────────────────────────────────────────────

describe("SemVerSchema", () => {
  it("accepts valid semver", () => {
    expect(SemVerSchema.safeParse("0.0.1").success).toBe(true);
    expect(SemVerSchema.safeParse("1.2.3").success).toBe(true);
  });

  it("rejects missing patch segment", () => {
    expect(SemVerSchema.safeParse("1.0").success).toBe(false);
  });

  it("rejects non-numeric segments", () => {
    expect(SemVerSchema.safeParse("1.0.alpha").success).toBe(false);
  });
});

// ── Key schemas ──────────────────────────────────────────────────────────────

describe("PackKeySchema", () => {
  it("accepts valid pack keys", () => {
    expect(PackKeySchema.safeParse("pack.corporate_pr.v1").success).toBe(true);
    expect(PackKeySchema.safeParse("pack.book_to_agent.v2").success).toBe(true);
  });

  it("rejects wrong prefix", () => {
    expect(PackKeySchema.safeParse("casepack.foo.v1").success).toBe(false);
  });

  it("rejects missing version", () => {
    expect(PackKeySchema.safeParse("pack.corporate_pr").success).toBe(false);
  });
});

describe("CasePackKeySchema", () => {
  it("accepts valid casepack keys", () => {
    expect(CasePackKeySchema.safeParse("casepack.pr_answer_card.v1").success).toBe(true);
  });

  it("rejects pack prefix", () => {
    expect(CasePackKeySchema.safeParse("pack.foo.v1").success).toBe(false);
  });
});

describe("BridgeKeySchema", () => {
  it("accepts valid bridge keys", () => {
    expect(BridgeKeySchema.safeParse("bridge.pr_to_release.v1").success).toBe(true);
  });

  it("rejects wrong prefix", () => {
    expect(BridgeKeySchema.safeParse("casepack.foo.v1").success).toBe(false);
  });
});

// ── JsonValueSchema ──────────────────────────────────────────────────────────

describe("JsonValueSchema", () => {
  it("accepts primitives", () => {
    expect(JsonValueSchema.safeParse("hello").success).toBe(true);
    expect(JsonValueSchema.safeParse(42).success).toBe(true);
    expect(JsonValueSchema.safeParse(true).success).toBe(true);
    expect(JsonValueSchema.safeParse(null).success).toBe(true);
  });

  it("accepts nested objects and arrays", () => {
    expect(JsonValueSchema.safeParse({ a: [1, { b: "c" }] }).success).toBe(true);
  });

  it("rejects undefined", () => {
    expect(JsonValueSchema.safeParse(undefined).success).toBe(false);
  });

  it("rejects functions", () => {
    expect(JsonValueSchema.safeParse(() => "x").success).toBe(false);
  });
});

describe("JsonObjectSchema", () => {
  it("accepts a plain object with JSON values", () => {
    expect(JsonObjectSchema.safeParse({ key: "value", n: 1 }).success).toBe(true);
  });

  it("rejects an array (not an object)", () => {
    expect(JsonObjectSchema.safeParse([1, 2, 3]).success).toBe(false);
  });

  it("rejects a string", () => {
    expect(JsonObjectSchema.safeParse("string").success).toBe(false);
  });
});

// ── Status enum schemas ───────────────────────────────────────────────────────

describe("RunStatusSchema", () => {
  it("accepts all valid run statuses", () => {
    for (const val of Object.values(RUN_STATUS)) {
      expect(RunStatusSchema.safeParse(val).success).toBe(true);
    }
  });

  it("rejects an unknown status", () => {
    expect(RunStatusSchema.safeParse("cancelled").success).toBe(false);
  });
});

describe("PackStatusSchema", () => {
  it("accepts all valid pack statuses", () => {
    for (const val of Object.values(PACK_STATUS)) {
      expect(PackStatusSchema.safeParse(val).success).toBe(true);
    }
  });
});

describe("VisibilityLevelSchema", () => {
  it("accepts all visibility levels", () => {
    for (const val of Object.values(VISIBILITY_LEVEL)) {
      expect(VisibilityLevelSchema.safeParse(val).success).toBe(true);
    }
  });

  it("rejects 'protected'", () => {
    expect(VisibilityLevelSchema.safeParse("protected").success).toBe(false);
  });
});

describe("AppTypeSchema", () => {
  it("accepts 'casepack' and 'graph'", () => {
    expect(AppTypeSchema.safeParse(APP_TYPE.CASEPACK).success).toBe(true);
    expect(AppTypeSchema.safeParse(APP_TYPE.GRAPH).success).toBe(true);
  });

  it("rejects 'hybrid'", () => {
    expect(AppTypeSchema.safeParse("hybrid").success).toBe(false);
  });
});

describe("AIProviderSchema", () => {
  it("accepts all registered providers", () => {
    for (const val of Object.values(AI_PROVIDER)) {
      expect(AIProviderSchema.safeParse(val).success).toBe(true);
    }
  });

  it("rejects an unregistered provider", () => {
    expect(AIProviderSchema.safeParse("cohere").success).toBe(false);
  });
});

// ── AppError ─────────────────────────────────────────────────────────────────

describe("AppError", () => {
  it("is an instance of Error", () => {
    const err = new AppError(AppErrorCode.NOT_FOUND, "Not found");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it("carries the correct code and message", () => {
    const err = new AppError(AppErrorCode.VALIDATION_ERROR, "Bad input", { field: "name" });
    expect(err.code).toBe(AppErrorCode.VALIDATION_ERROR);
    expect(err.message).toBe("Bad input");
    expect(err.details).toEqual({ field: "name" });
    expect(err.name).toBe("AppError");
  });

  it("serialises to JSON correctly", () => {
    const err = new AppError(AppErrorCode.FORBIDDEN, "Access denied");
    const json = err.toJSON();
    expect(json.code).toBe("FORBIDDEN");
    expect(json.name).toBe("AppError");
    expect(json.message).toBe("Access denied");
  });

  it("supports all error codes", () => {
    for (const code of Object.values(AppErrorCode)) {
      const err = new AppError(code, "test");
      expect(err.code).toBe(code);
    }
  });
});

// ── safeParseOrThrow ──────────────────────────────────────────────────────────

describe("safeParseOrThrow", () => {
  const TestSchema = z.object({ name: z.string(), age: z.number() });

  it("returns typed data on valid input", () => {
    const result = safeParseOrThrow(TestSchema, { name: "Alice", age: 30 });
    expect(result.name).toBe("Alice");
    expect(result.age).toBe(30);
  });

  it("throws AppError on invalid input", () => {
    expect(() =>
      safeParseOrThrow(TestSchema, { name: "Bob" })
    ).toThrowError(AppError);
  });

  it("thrown AppError has VALIDATION_ERROR code", () => {
    try {
      safeParseOrThrow(TestSchema, { name: 123 });
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).code).toBe(AppErrorCode.VALIDATION_ERROR);
    }
  });

  it("thrown AppError includes Zod issue details", () => {
    try {
      safeParseOrThrow(TestSchema, {});
    } catch (e) {
      expect((e as AppError).details).toBeDefined();
      expect(Array.isArray((e as AppError).details)).toBe(true);
    }
  });
});

// ── safeParse ────────────────────────────────────────────────────────────────

describe("safeParse", () => {
  const TestSchema = z.object({ id: z.string().uuid() });

  it("returns success:true with typed data on valid input", () => {
    const result = safeParse(TestSchema, { id: "550e8400-e29b-41d4-a716-446655440000" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("550e8400-e29b-41d4-a716-446655440000");
    }
  });

  it("returns success:false with ZodError on invalid input", () => {
    const result = safeParse(TestSchema, { id: "not-a-uuid" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });

  it("does NOT throw — returns discriminated union", () => {
    expect(() => safeParse(TestSchema, { id: "bad" })).not.toThrow();
  });
});
