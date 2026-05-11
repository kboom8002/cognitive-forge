/**
 * S00-T01 Bootstrap test — verifies that the monorepo structure is in place.
 *
 * This is a structural smoke test. Real unit and integration tests
 * are added per sprint starting from Sprint 01.
 */

import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "..");

const REQUIRED_DIRS = [
  "apps/web",
  "packages/core",
  "packages/casepack",
  "packages/domain-packs",
  "packages/runtime",
  "packages/bridge",
  "packages/ui-forge",
  "packages/validation",
  "supabase/migrations",
  "supabase/seed",
  "tests",
  "scripts",
  "docs",
];

const FORBIDDEN_ROOT_DIRS = ["src", "lib", "server", "client"];

const REQUIRED_FILES = [
  "package.json",
  "pnpm-workspace.yaml",
  "tsconfig.json",
  ".npmrc",
  ".gitignore",
  ".env.example",
  "README.md",
  "vitest.config.ts",
  // S00-T01: apps/web shell
  "apps/web/package.json",
  "apps/web/tsconfig.json",
  "apps/web/next.config.ts",
  "apps/web/app/layout.tsx",
  "apps/web/app/page.tsx",
  "apps/web/app/a/[slug]/page.tsx",
  // S00-T02: web app baseline
  "apps/web/app/globals.css",
  "apps/web/app/api/health/route.ts",
  "apps/web/postcss.config.mjs",
  "apps/web/next-env.d.ts",
];

describe("S00-T01 Monorepo Structure", () => {
  it("has all required directories", () => {
    for (const dir of REQUIRED_DIRS) {
      expect(existsSync(resolve(root, dir)), `Missing dir: ${dir}`).toBe(true);
    }
  });

  it("has no forbidden root directories", () => {
    for (const dir of FORBIDDEN_ROOT_DIRS) {
      expect(existsSync(resolve(root, dir)), `Forbidden dir exists: ${dir}`).toBe(false);
    }
  });

  it("has all required files", () => {
    for (const file of REQUIRED_FILES) {
      expect(existsSync(resolve(root, file)), `Missing file: ${file}`).toBe(true);
    }
  });

  it("packages/core has no internal @cognitive-forge/* dependencies", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require(resolve(root, "packages/core/package.json")) as {
      dependencies?: Record<string, string>;
    };
    const deps = Object.keys(pkg.dependencies ?? {});
    const internalDeps = deps.filter((d) => d.startsWith("@cognitive-forge/"));
    expect(internalDeps).toEqual([]);
  });
});
