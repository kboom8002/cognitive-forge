/**
 * Platform-wide status and classification constants.
 *
 * Using `as const` objects instead of enums so values are:
 * - plain strings (JSON-serialisable)
 * - tree-shakeable
 * - usable as Zod enum inputs directly via Object.values(...)
 *
 * Companion Zod enum schemas live in src/schemas/primitives.ts.
 */

// ── Run status ──────────────────────────────────────────────────────────────

export const RUN_STATUS = {
  PENDING:  "pending",
  RUNNING:  "running",
  SUCCESS:  "success",
  FAILED:   "failed",
  REPAIRED: "repaired",
  TIMEOUT:  "timeout",
} as const;

export type RunStatus = (typeof RUN_STATUS)[keyof typeof RUN_STATUS];

// ── Pack / object lifecycle status ──────────────────────────────────────────

export const PACK_STATUS = {
  DRAFT:      "draft",
  PUBLISHED:  "published",
  DEPRECATED: "deprecated",
  ARCHIVED:   "archived",
} as const;

export type PackStatus = (typeof PACK_STATUS)[keyof typeof PACK_STATUS];

// ── Visibility level ─────────────────────────────────────────────────────────

export const VISIBILITY_LEVEL = {
  PUBLIC:    "public",
  WORKSPACE: "workspace",
  PRIVATE:   "private",
} as const;

export type VisibilityLevel = (typeof VISIBILITY_LEVEL)[keyof typeof VISIBILITY_LEVEL];

// ── App type ─────────────────────────────────────────────────────────────────

export const APP_TYPE = {
  CASEPACK: "casepack",
  GRAPH:    "graph",
} as const;

export type AppType = (typeof APP_TYPE)[keyof typeof APP_TYPE];

// ── AI provider ──────────────────────────────────────────────────────────────

export const AI_PROVIDER = {
  OPENAI:    "openai",
  ANTHROPIC: "anthropic",
  GEMINI:    "gemini",
  MOCK:      "mock",   // used in tests and dev seeds
} as const;

export type AIProvider = (typeof AI_PROVIDER)[keyof typeof AI_PROVIDER];
