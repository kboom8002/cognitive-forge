#!/usr/bin/env tsx
/**
 * scripts/validate-fixtures.ts
 *
 * Validates all fixture JSON files against their respective Zod schemas.
 *
 * Detection logic (by `key` field prefix in each JSON):
 *   casepack.*  → CasePackMAOSchema
 *   bridge.*    → BridgeCasePackSchema
 *   graph.*     → CasePackGraphSchema
 *   pack.*      → DomainPackManifestSchema
 *   app obj     → AppObjectSchema  (detected by presence of `slug` field)
 *
 * Exit codes:
 *   0 — all fixtures pass
 *   1 — one or more fixtures fail
 *
 * Usage:
 *   pnpm fixtures:validate
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { glob } from "glob";
import {
  CasePackMAOSchema,
  BridgeCasePackSchema,
  CasePackGraphSchema,
  DomainPackManifestSchema,
  AppObjectSchema,
} from "@cognitive-forge/core";
import type { ZodTypeAny } from "zod";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ValidationResult {
  file: string;
  passed: boolean;
  errors: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROOT = path.resolve(process.cwd());
const FIXTURES_DIR = path.join(ROOT, "docs", "fixtures");

function loadJson(filePath: string): unknown {
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch (e) {
    throw new Error(`Failed to parse JSON: ${String(e)}`);
  }
}

function validate(schema: ZodTypeAny, data: unknown, filePath: string): ValidationResult {
  const rel  = path.relative(ROOT, filePath).replaceAll("\\", "/");
  const result = schema.safeParse(data);
  if (result.success) {
    return { file: rel, passed: true, errors: [] };
  }
  const errors = result.error.issues.map(
    (i) => `  • ${i.path.length ? i.path.join(".") + ": " : ""}${i.message}`
  );
  return { file: rel, passed: false, errors };
}

/**
 * Detect which schema to use for a fixture JSON.
 * Priority: key prefix → then presence of slug (AppObject).
 */
function detectSchema(data: unknown): { schema: ZodTypeAny; schemaName: string } | null {
  if (typeof data !== "object" || data === null) return null;
  const rec = data as Record<string, unknown>;
  const key = typeof rec["key"] === "string" ? rec["key"] : null;

  if (key) {
    if (key.startsWith("casepack.")) return { schema: CasePackMAOSchema,       schemaName: "CasePackMAOSchema"        };
    if (key.startsWith("bridge."))   return { schema: BridgeCasePackSchema,    schemaName: "BridgeCasePackSchema"     };
    if (key.startsWith("graph."))    return { schema: CasePackGraphSchema,      schemaName: "CasePackGraphSchema"      };
    if (key.startsWith("pack."))     return { schema: DomainPackManifestSchema, schemaName: "DomainPackManifestSchema" };
  }

  // AppObject: has slug + type but no key
  if (typeof rec["slug"] === "string" && typeof rec["type"] === "string") {
    return { schema: AppObjectSchema, schemaName: "AppObjectSchema" };
  }

  return null;
}

// ── Glob + validate ───────────────────────────────────────────────────────────

async function validateDirectory(pattern: string, label: string): Promise<ValidationResult[]> {
  const files = await glob(pattern, { cwd: ROOT, absolute: true });

  if (files.length === 0) {
    console.log(`  ⚠  No files matched: ${pattern.replace(ROOT, ".")}`);
    return [];
  }

  const results: ValidationResult[] = [];

  for (const filePath of files.sort()) {
    let data: unknown;
    try {
      data = loadJson(filePath);
    } catch (e) {
      const rel = path.relative(ROOT, filePath).replaceAll("\\", "/");
      results.push({ file: rel, passed: false, errors: [`  • Parse error: ${String(e)}`] });
      continue;
    }

    const detected = detectSchema(data);
    if (!detected) {
      const rel = path.relative(ROOT, filePath).replaceAll("\\", "/");
      results.push({
        file: rel,
        passed: false,
        errors: [`  • Could not detect schema (no recognized 'key' prefix and no 'slug'+'type' fields)`],
      });
      continue;
    }

    results.push(validate(detected.schema, data, filePath));
  }

  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("\n🔍 Cognitive Forge — Fixture Validator\n");

  const sections: Array<{ label: string; pattern: string }> = [
    { label: "Domain Pack manifests",     pattern: "docs/fixtures/packs/**/*.json"     },
    { label: "CasePack / Bridge objects", pattern: "docs/fixtures/casepacks/**/*.json" },
    { label: "Graph definitions",         pattern: "docs/fixtures/graphs/**/*.json"    },
    { label: "App objects",               pattern: "docs/fixtures/apps/**/*.json"      },
  ];

  let totalPass = 0;
  let totalFail = 0;
  const allFailed: ValidationResult[] = [];

  for (const { label, pattern } of sections) {
    console.log(`── ${label} ──────────────────────────────`);
    const results = await validateDirectory(pattern, label);

    if (results.length === 0) {
      console.log("  (no fixtures found — skipped)\n");
      continue;
    }

    for (const r of results) {
      if (r.passed) {
        console.log(`  ✅ ${r.file}`);
        totalPass++;
      } else {
        console.log(`  ❌ ${r.file}`);
        for (const err of r.errors) console.log(`     ${err}`);
        totalFail++;
        allFailed.push(r);
      }
    }
    console.log();
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  console.log("══════════════════════════════════════════");
  console.log(`  Passed: ${totalPass}   Failed: ${totalFail}   Total: ${totalPass + totalFail}`);
  console.log("══════════════════════════════════════════\n");

  if (totalFail > 0) {
    console.error(`\n💥 ${totalFail} fixture(s) failed validation. Fix before seeding.\n`);
    process.exit(1);
  }

  if (totalPass === 0 && totalFail === 0) {
    console.log("⚠  No fixture files found. Create fixtures in docs/fixtures/ before running seed.\n");
    // Not a failure — fixtures haven't been written yet
    process.exit(0);
  }

  console.log("✅ All fixtures pass validation.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("💥 Unexpected error:", err);
  process.exit(1);
});
