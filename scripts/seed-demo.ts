#!/usr/bin/env tsx
/**
 * scripts/seed-demo.ts
 *
 * Seeds all P0 demo fixtures into a live Supabase instance.
 *
 * REQUIREMENTS:
 *   NEXT_PUBLIC_SUPABASE_URL       — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY      — Service role key (never expose publicly)
 *
 * IDEMPOTENT: safe to run multiple times — uses upsert on all tables.
 *
 * VALIDATION: runs fixture schema validation before any DB writes.
 * Aborts if any fixture is invalid.
 *
 * Usage:
 *   pnpm seed:demo
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { glob } from "glob";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  CasePackMAOSchema,
  BridgeCasePackSchema,
  CasePackGraphSchema,
  DomainPackManifestSchema,
  AppObjectSchema,
} from "@cognitive-forge/core";

// ── Constants ─────────────────────────────────────────────────────────────────

const ROOT         = path.resolve(process.cwd());
// FIXTURES_DIR not needed at runtime — glob patterns are relative to ROOT

const DEMO_WORKSPACE_SLUG = "cognitive-forge-demo";
const DEMO_WORKSPACE_NAME = "Cognitive Forge Demo";

const PUBLIC_APP_URLS = [
  "/a/corporate-pr-suite",
  "/a/book-to-agent",
  "/a/prompt-improvement-practice",
  "/a/ai-training-practice-suite",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

function loadEnvFile(): void {
  // Try .env.local first, then .env
  for (const name of [".env.local", ".env"]) {
    const envPath = path.join(ROOT, name);
    if (existsSync(envPath)) {
      const lines = readFileSync(envPath, "utf-8").split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const idx = trimmed.indexOf("=");
        if (idx === -1) continue;
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
        if (key && !(key in process.env)) {
          process.env[key] = val;
        }
      }
      console.log(`  Loaded env from ${name}`);
      return;
    }
  }
}

function abort(msg: string): never {
  console.error(`\n💥 ${msg}\n`);
  process.exit(1);
}

// ── Inline fixture validation ──────────────────────────────────────────────────

interface FixtureCheck { file: string; passed: boolean; errors: string[] }

function detectAndValidate(data: unknown, filePath: string): FixtureCheck {
  const rel = path.relative(ROOT, filePath).replaceAll("\\", "/");
  if (typeof data !== "object" || data === null) {
    return { file: rel, passed: false, errors: ["Not a JSON object"] };
  }
  const rec = data as Record<string, unknown>;
  const key = typeof rec["key"] === "string" ? rec["key"] : null;

  let schema;
  if (key) {
    if (key.startsWith("casepack.")) schema = CasePackMAOSchema;
    else if (key.startsWith("bridge."))  schema = BridgeCasePackSchema;
    else if (key.startsWith("graph."))   schema = CasePackGraphSchema;
    else if (key.startsWith("pack."))    schema = DomainPackManifestSchema;
  } else if (typeof rec["slug"] === "string" && typeof rec["type"] === "string") {
    schema = AppObjectSchema;
  }

  if (!schema) {
    return { file: rel, passed: false, errors: ["Cannot detect schema — no recognized key prefix or slug+type"] };
  }

  const result = schema.safeParse(data);
  if (result.success) return { file: rel, passed: true, errors: [] };
  const errors = result.error.issues.map(
    (i) => `${i.path.length ? i.path.join(".") + ": " : ""}${i.message}`
  );
  return { file: rel, passed: false, errors };
}

async function runValidation(): Promise<void> {
  console.log("\n🔍 Validating fixtures before seeding...\n");

  const patterns = [
    "docs/fixtures/packs/**/*.json",
    "docs/fixtures/casepacks/**/*.json",
    "docs/fixtures/graphs/**/*.json",
    "docs/fixtures/apps/**/*.json",
  ];

  let totalPass = 0;
  let totalFail = 0;

  for (const pattern of patterns) {
    const files = await glob(pattern, { cwd: ROOT, absolute: true });
    for (const filePath of files.sort()) {
      const data = loadJson(filePath);
      const check = detectAndValidate(data, filePath);
      if (check.passed) {
        totalPass++;
      } else {
        console.error(`  ❌ ${check.file}`);
        for (const e of check.errors) console.error(`     • ${e}`);
        totalFail++;
      }
    }
  }

  if (totalFail > 0) {
    abort(`${totalFail} fixture(s) failed validation. Fix before seeding.`);
  }
  if (totalPass === 0) {
    abort("No fixture files found. Create fixtures before seeding.");
  }

  console.log(`  ✅ ${totalPass} fixtures validated.\n`);
}

// ── Supabase client ────────────────────────────────────────────────────────────

function buildClient(): SupabaseClient {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!url || !key) {
    abort(
      "Missing Supabase env vars.\n" +
      "  Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY\n" +
      "  Set these in .env.local and re-run."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ── DB helpers ────────────────────────────────────────────────────────────────

async function upsert(
  sb: SupabaseClient,
  table: string,
  row: Record<string, unknown>,
  conflictColumn: string
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from(table) as any)
    .upsert(row, { onConflict: conflictColumn, ignoreDuplicates: false })
    .select("id")
    .single();

  if (error) abort(`[${table}] upsert failed: ${error.message}\n  Row: ${JSON.stringify(row)}`);
  return (data as { id: string }).id;
}


// ── Workspace ─────────────────────────────────────────────────────────────────

async function ensureWorkspace(sb: SupabaseClient): Promise<string> {
  console.log(`── Workspace: ${DEMO_WORKSPACE_SLUG}`);

  // Try to fetch first
  const { data: existing } = await sb
    .from("workspaces")
    .select("id")
    .eq("slug", DEMO_WORKSPACE_SLUG)
    .maybeSingle();

  if (existing) {
    console.log(`  ✓ Workspace exists (id=${existing.id})`);
    return existing.id as string;
  }

  const id = await upsert(sb, "workspaces", {
    slug:         DEMO_WORKSPACE_SLUG,
    display_name: DEMO_WORKSPACE_NAME,
    plan:         "pro",
    settings:     {},
  }, "slug");

  console.log(`  ✓ Created workspace (id=${id})`);
  return id;
}

// ── CasePacks ─────────────────────────────────────────────────────────────────

async function seedCasePacks(sb: SupabaseClient): Promise<void> {
  console.log("\n── CasePacks");

  const files = await glob("docs/fixtures/casepacks/**/*.json", { cwd: ROOT, absolute: true });

  for (const filePath of files.sort()) {
    const data = loadJson(filePath) as Record<string, unknown>;
    const key = data["key"] as string;
    const isBridge = key.startsWith("bridge.");

    // Bridges are seeded as CasePack rows (platform-level, workspace_id=null)
    // using the BRIDGE key directly in casepacks table is NOT correct since
    // casepacks.key has a CHECK constraint for casepack.* prefix only.
    // Bridges are NOT stored in the casepacks table — they live in BridgeCasePack schema
    // and are referenced by key only. Skip them for casepacks table seeding.
    if (isBridge) {
      console.log(`  ⤳  bridge (skip casepacks table): ${key}`);
      continue;
    }

    const version = data["version"] as string;

    // Upsert parent row
    const caId = await upsert(sb, "casepacks", {
      key,
      status:       data["status"] ?? "published",
      visibility:   "public",
      workspace_id: null,
    }, "key");
    console.log(`  ✓ casepack: ${key}`);

    // Upsert version row
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: vErr } = await (sb.from("casepack_versions") as any)
      .upsert(
        { casepack_id: caId, version, casepack_json: data, is_current: true },
        { onConflict: "casepack_id,version" }
      );

    if (vErr) abort(`[casepack_versions] upsert failed for ${key}: ${vErr.message}`);

    // Set all other versions to is_current=false, then set this one to true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb.from("casepack_versions") as any).update({ is_current: false }).eq("casepack_id", caId).neq("version", version);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb.from("casepack_versions") as any).update({ is_current: true  }).eq("casepack_id", caId).eq("version", version);

    console.log(`    ↳ version ${version} (current)`);
  }
}

// ── Graphs ────────────────────────────────────────────────────────────────────

async function seedGraphs(sb: SupabaseClient): Promise<void> {
  console.log("\n── Graphs");

  const files = await glob("docs/fixtures/graphs/**/*.json", { cwd: ROOT, absolute: true });

  for (const filePath of files.sort()) {
    const data = loadJson(filePath) as Record<string, unknown>;
    const key        = data["key"]        as string;
    const version    = data["version"]    as string;
    const entryNode  = data["entry_node"] as string;
    const finalNodes = data["final_nodes"] as string[];

    const grId = await upsert(sb, "casepack_graphs", {
      key,
      status:       data["status"] ?? "published",
      entry_node:   entryNode,
      final_nodes:  finalNodes,
      workspace_id: null,
    }, "key");
    console.log(`  ✓ graph: ${key}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: vErr } = await (sb.from("graph_versions") as any)
      .upsert(
        { graph_id: grId, version, graph_json: data, is_current: true },
        { onConflict: "graph_id,version" }
      );

    if (vErr) abort(`[graph_versions] upsert failed for ${key}: ${vErr.message}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb.from("graph_versions") as any).update({ is_current: false }).eq("graph_id", grId).neq("version", version);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb.from("graph_versions") as any).update({ is_current: true  }).eq("graph_id", grId).eq("version", version);

    console.log(`    ↳ version ${version} (current)`);
  }
}

// ── Domain Packs ──────────────────────────────────────────────────────────────

async function seedDomainPacks(sb: SupabaseClient): Promise<void> {
  console.log("\n── Domain Packs");

  const files = await glob("docs/fixtures/packs/**/*.json", { cwd: ROOT, absolute: true });

  for (const filePath of files.sort()) {
    const data    = loadJson(filePath) as Record<string, unknown>;
    const key     = data["key"]     as string;
    const version = data["version"] as string;
    const assets  = data["assets"]  as Record<string, unknown[]>;
    const primaryAppSlug = data["primary_app_slug"] as string;

    const dpId = await upsert(sb, "domain_packs", {
      key,
      status:          data["status"] ?? "published",
      visibility:      "public",
      primary_app_slug: primaryAppSlug,
      workspace_id:    null,
    }, "key");
    console.log(`  ✓ domain_pack: ${key}`);

    // Upsert version
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: vErr } = await (sb.from("domain_pack_versions") as any)
      .upsert(
        { domain_pack_id: dpId, version, manifest_json: data, is_current: true },
        { onConflict: "domain_pack_id,version" }
      );

    if (vErr) abort(`[domain_pack_versions] upsert failed for ${key}: ${vErr.message}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb.from("domain_pack_versions") as any).update({ is_current: false }).eq("domain_pack_id", dpId).neq("version", version);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb.from("domain_pack_versions") as any).update({ is_current: true  }).eq("domain_pack_id", dpId).eq("version", version);

    // Sync assets — delete stale, insert fresh
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb.from("domain_pack_assets") as any).delete().eq("domain_pack_id", dpId);

    const assetRows: Array<{ domain_pack_id: string; asset_type: string; asset_key: string }> = [];

    for (const appAsset of (assets["apps"] ?? []) as Array<Record<string, string>>) {
      assetRows.push({ domain_pack_id: dpId, asset_type: "app", asset_key: appAsset["slug"] ?? "" });
    }
    for (const cpKey of (assets["casepacks"] ?? []) as string[]) {
      assetRows.push({ domain_pack_id: dpId, asset_type: "casepack", asset_key: cpKey });
    }
    for (const brKey of (assets["bridges"] ?? []) as string[]) {
      assetRows.push({ domain_pack_id: dpId, asset_type: "bridge", asset_key: brKey });
    }
    for (const grKey of (assets["graphs"] ?? []) as string[]) {
      assetRows.push({ domain_pack_id: dpId, asset_type: "graph", asset_key: grKey });
    }

    if (assetRows.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: aErr } = await (sb.from("domain_pack_assets") as any).insert(assetRows);
      if (aErr) abort(`[domain_pack_assets] insert failed for ${key}: ${aErr.message}`);
    }

    console.log(`    ↳ version ${version} (current), ${assetRows.length} assets`);
  }
}

// ── Apps ──────────────────────────────────────────────────────────────────────

async function seedApps(sb: SupabaseClient): Promise<void> {
  console.log("\n── Apps");

  const files = await glob("docs/fixtures/apps/**/*.json", { cwd: ROOT, absolute: true });

  for (const filePath of files.sort()) {
    const data = loadJson(filePath) as Record<string, unknown>;

    const row: Record<string, unknown> = {
      slug:         data["slug"],
      title:        data["title"],
      type:         data["type"],
      visibility:   data["visibility"] ?? "public",
      workspace_id: null,
      extra:        data["extra"] ?? {},
    };

    if (data["description"] !== undefined) row["description"] = data["description"];
    if (data["pack_key"]    !== undefined) row["pack_key"]    = data["pack_key"];

    // XOR key
    if (data["type"] === "casepack") {
      row["casepack_key"] = data["casepack_key"];
      row["graph_key"]    = null;
    } else {
      row["graph_key"]    = data["graph_key"];
      row["casepack_key"] = null;
    }

    await upsert(sb, "apps", row, "slug");
    console.log(`  ✓ app: /a/${data["slug"] as string} (type=${data["type"] as string})`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("\n🌱 Cognitive Forge — Demo Seed Script\n");

  // 1. Load env
  loadEnvFile();

  // 2. Validate fixtures — abort if any fail
  await runValidation();

  // 3. Check Supabase env
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!url || !key) {
    console.warn(
      "⚠  Supabase env vars not set — skipping DB seeding.\n" +
      "   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY\n" +
      "   in .env.local and re-run.\n\n" +
      "   Fixtures validated successfully — ready to seed when DB is available.\n"
    );
    console.log("📋 Public app URLs (once seeded):");
    for (const u of PUBLIC_APP_URLS) console.log(`   ${u}`);
    console.log();
    process.exit(0);
  }

  const sb = buildClient();

  // 4. Seed in dependency order
  await ensureWorkspace(sb);
  await seedCasePacks(sb);
  await seedGraphs(sb);
  await seedDomainPacks(sb);
  await seedApps(sb);

  // 5. Summary
  console.log("\n══════════════════════════════════════════");
  console.log("  ✅ Demo seed complete.");
  console.log("══════════════════════════════════════════\n");
  console.log("📋 Seeded public app URLs:");
  for (const u of PUBLIC_APP_URLS) console.log(`   ${u}`);
  console.log();

  process.exit(0);
}

main().catch((err: unknown) => {
  console.error("💥 Unexpected error:", err);
  process.exit(1);
});
