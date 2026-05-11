/**
 * Common Zod primitive schemas shared across all 14 platform schemas.
 *
 * Keep this file focused on reusable atoms — no composite object schemas here.
 * Composite schemas live in their own files under src/schemas/.
 *
 * ISOLATION: no React, Next.js, Supabase, or other @cognitive-forge/* imports.
 */

import { z } from "zod";
import type { JsonValue, JsonObject } from "../types/json";
import {
  RUN_STATUS,
  PACK_STATUS,
  VISIBILITY_LEVEL,
  APP_TYPE,
  AI_PROVIDER,
} from "../constants/index";

// ── Scalar primitives ────────────────────────────────────────────────────────

/** RFC 4122 UUID (any version). */
export const UUIDSchema = z.string().uuid();

/**
 * ISO 8601 datetime string with timezone offset.
 * e.g. "2026-05-02T12:00:00Z" or "2026-05-02T12:00:00+09:00"
 */
export const ISODateTimeSchema = z.string().datetime({ offset: true });

/**
 * URL-safe slug: lowercase alphanumeric segments joined by hyphens.
 * e.g. "corporate-pr-suite", "book-to-agent"
 */
export const SlugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "Slug must be lowercase alphanumeric segments separated by hyphens",
  });

/**
 * Semantic version string.
 * e.g. "1.0.0", "0.2.3"
 */
export const SemVerSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/, { message: "Must be a valid semver string (e.g. 1.0.0)" });

/**
 * Domain Pack key format: pack.<name>.v<number>
 * e.g. "pack.corporate_pr.v1"
 */
export const PackKeySchema = z
  .string()
  .regex(/^pack\.[a-z0-9_]+\.v\d+$/, {
    message: "Pack key must match pattern: pack.<name>.v<version>",
  });

/**
 * CasePack key format: casepack.<name>.v<number>
 * e.g. "casepack.pr_answer_card.v1"
 */
export const CasePackKeySchema = z
  .string()
  .regex(/^casepack\.[a-z0-9_]+\.v\d+$/, {
    message: "CasePack key must match pattern: casepack.<name>.v<version>",
  });

/**
 * Bridge CasePack key format: bridge.<name>.v<number>
 * e.g. "bridge.pr_to_release.v1"
 */
export const BridgeKeySchema = z
  .string()
  .regex(/^bridge\.[a-z0-9_]+\.v\d+$/, {
    message: "Bridge key must match pattern: bridge.<name>.v<version>",
  });

/**
 * CasePack Graph key format: graph.<name>.v<number>
 * e.g. "graph.corporate_pr_suite.v1"
 */
export const GraphKeySchema = z
  .string()
  .regex(/^graph\.[a-z0-9_]+\.v\d+$/, {
    message: "Graph key must match pattern: graph.<name>.v<version>",
  });

// ── JSON value schemas ───────────────────────────────────────────────────────

/**
 * Zod schema for an arbitrary JSON value (recursive).
 * Typed as z.ZodType<JsonValue> to match our TypeScript type.
 */
export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ])
);

/** Zod schema for a JSON object (string-keyed, arbitrary values). */
export const JsonObjectSchema: z.ZodType<JsonObject> = z.record(
  z.string(),
  JsonValueSchema
);

// ── Status and classification enums ─────────────────────────────────────────

export const RunStatusSchema = z.enum(
  Object.values(RUN_STATUS) as [string, ...string[]]
);

export const PackStatusSchema = z.enum(
  Object.values(PACK_STATUS) as [string, ...string[]]
);

export const VisibilityLevelSchema = z.enum(
  Object.values(VISIBILITY_LEVEL) as [string, ...string[]]
);

export const AppTypeSchema = z.enum(
  Object.values(APP_TYPE) as [string, ...string[]]
);

export const AIProviderSchema = z.enum(
  Object.values(AI_PROVIDER) as [string, ...string[]]
);
