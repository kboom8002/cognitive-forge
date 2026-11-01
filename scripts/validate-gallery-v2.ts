/**
 * Gallery v2.0 & Core v2.0 Complete Specification & Schema Validator
 *
 * TypeScript equivalent + live runtime verification of:
 * - `docs/Cognitive_Forge_OS_Gallery_Repo_Docs_v2_0/tests/validate.py`
 * - `docs/Cognitive_Forge_OS_Gallery_Repo_Docs_v2_0/tests/validate_gallery.py`
 *
 * Verifies:
 * 1. All 9 Core schemas & examples (`schemas/*.schema.json` + `examples/*.json`) + 9 missing-required negative checks
 * 2. All 11 Gallery schemas & examples (`gallery/schemas/*.schema.json` + `gallery/examples/*.json`)
 * 3. All 4 Gallery negative cases (`gallery/examples/negative_cases.json`)
 * 4. 36 unique CatalogEntry items (6x6 across 6 primary categories, `preview_only`, `runtime_release_id: null`, `expert_verified: false`)
 * 5. 12 PilotPack items + 36 BenchmarkTask items + input_schema compatibility
 * 6. OpenAPI (`contracts/openapi.json`, `contracts/gallery-openapi.json`) & AsyncAPI (`contracts/asyncapi.json`) internal `$ref` integrity
 * 7. 28 Markdown specification documents (`00_*.md` ~ `27_*.md`)
 * 8. 6 Multi-agent bundles (`gallery/catalog/bundles.json`) referencing valid catalog `agent_id`s
 */

import * as fs from "fs";
import * as path from "path";
import {
  V2_CORE_SCHEMAS,
  V2_GALLERY_SCHEMAS,
  CatalogEntrySchema,
  PilotPackSchema,
  BenchmarkTaskSchema,
} from "@cognitive-forge/core";

const DOCS_ROOT = path.resolve(
  process.cwd(),
  "docs/Cognitive_Forge_OS_Gallery_Repo_Docs_v2_0"
);

function readJson(relPath: string): any {
  const fullPath = path.join(DOCS_ROOT, relPath);
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function walkRefs(node: unknown, rootDoc: Record<string, any>): void {
  if (Array.isArray(node)) {
    for (const item of node) walkRefs(item, rootDoc);
  } else if (node && typeof node === "object") {
    const rec = node as Record<string, unknown>;
    if (typeof rec.$ref === "string" && rec.$ref.startsWith("#/")) {
      const segments = rec.$ref.slice(2).split("/");
      let target: any = rootDoc;
      for (const seg of segments) {
        const key = seg.replace(/~1/g, "/").replace(/~0/g, "~");
        if (target === undefined || target === null || !(key in target)) {
          throw new Error(`Broken internal $ref: ${rec.$ref}`);
        }
        target = target[key];
      }
    }
    for (const val of Object.values(rec)) {
      walkRefs(val, rootDoc);
    }
  }
}

function main(): void {
  const checks: string[] = [];

  // 1. Validate 9 Core schemas + positive & negative examples
  let coreCount = 0;
  for (const [schemaName, zodSchema] of Object.entries(V2_CORE_SCHEMAS)) {
    const schemaJson = readJson(`schemas/${schemaName}.schema.json`);
    const exampleJson = readJson(`examples/${schemaName}.json`);
    zodSchema.parse(exampleJson);

    const requiredKey = schemaJson.required?.[0];
    if (!requiredKey) {
      throw new Error(`Schema ${schemaName} has no required fields`);
    }
    const badExample = { ...exampleJson };
    delete badExample[requiredKey];
    const negResult = zodSchema.safeParse(badExample);
    if (negResult.success) {
      throw new Error(`Core negative test failed: ${schemaName} accepted missing '${requiredKey}'`);
    }
    checks.push(`core_schema_example:${schemaName}`);
    coreCount += 1;
  }

  // 2. Validate 11 Gallery schemas + examples
  for (const [schemaName, zodSchema] of Object.entries(V2_GALLERY_SCHEMAS)) {
    const exampleJson = readJson(`gallery/examples/${schemaName}.json`);
    zodSchema.parse(exampleJson);
    checks.push(`gallery_schema_example:${schemaName}`);
  }

  // 3. Validate 36 CatalogEntry items (6x6 per primary_category)
  const catalogRaw = readJson("gallery/catalog/agents36.json") as unknown[];
  if (catalogRaw.length !== 36) {
    throw new Error(`Expected 36 catalog entries, got ${catalogRaw.length}`);
  }
  const agentIds = new Set<string>();
  const categoryCounts = new Map<string, number>();

  for (const rawItem of catalogRaw) {
    const entry = CatalogEntrySchema.parse(rawItem);
    agentIds.add(entry.agent_id);
    categoryCounts.set(
      entry.primary_category,
      (categoryCounts.get(entry.primary_category) ?? 0) + 1
    );
    if (
      entry.availability !== "preview_only" ||
      entry.runtime_release_id !== null ||
      entry.expert_verified !== false
    ) {
      throw new Error(`Catalog entry ${entry.agent_id} violated initial preview_only invariant`);
    }
  }
  if (agentIds.size !== 36) {
    throw new Error(`Expected 36 unique agent_ids, got ${agentIds.size}`);
  }
  for (const [cat, cnt] of categoryCounts.entries()) {
    if (cnt !== 6) {
      throw new Error(`Category ${cat} has ${cnt} agents instead of 6`);
    }
  }
  checks.push("36_unique_6x6_preview_only");

  // 4. Validate 12 PilotPacks & 36 BenchmarkTasks
  const pilotDir = path.join(DOCS_ROOT, "gallery/pilot_packs");
  const pilotFiles = fs.readdirSync(pilotDir).filter((f) => f.endsWith(".json"));
  if (pilotFiles.length !== 12) {
    throw new Error(`Expected 12 pilot packs, got ${pilotFiles.length}`);
  }

  const tasksRaw = readJson("gallery/benchmarks/tasks.json") as unknown[];
  if (tasksRaw.length !== 36) {
    throw new Error(`Expected 36 benchmark tasks, got ${tasksRaw.length}`);
  }
  const tasks = tasksRaw.map((t) => BenchmarkTaskSchema.parse(t));
  const taskIds = new Set(tasks.map((t) => t.task_id));

  for (const pFile of pilotFiles) {
    const pack = PilotPackSchema.parse(readJson(`gallery/pilot_packs/${pFile}`));
    for (const bmId of pack.benchmark_ids) {
      if (!taskIds.has(bmId)) {
        throw new Error(`PilotPack ${pack.pack_id} references unknown benchmark ${bmId}`);
      }
    }
    const inputRequired = Array.isArray((pack.input_schema as Record<string, unknown>).required)
      ? ((pack.input_schema as Record<string, unknown>).required as string[])
      : [];

    for (const t of tasks) {
      if (t.agent_id === pack.agent_id) {
        for (const reqField of inputRequired) {
          if (!(reqField in t.input)) {
            throw new Error(
              `BenchmarkTask ${t.task_id} input is missing required field '${reqField}' for ${pack.agent_id}`
            );
          }
        }
      }
    }
  }
  checks.push("12_packs_36_benchmark_inputs");

  // 5. Validate 4 negative gallery cases
  const negativeCases = readJson("gallery/examples/negative_cases.json") as Array<{
    case: string;
    schema: keyof typeof V2_GALLERY_SCHEMAS;
    base: string;
    patch: Record<string, unknown>;
  }>;
  for (const neg of negativeCases) {
    const baseObj = readJson(`gallery/examples/${neg.base}.json`);
    const patched = { ...baseObj, ...neg.patch };
    const zodSchema = V2_GALLERY_SCHEMAS[neg.schema];
    const res = zodSchema.safeParse(patched);
    if (res.success) {
      throw new Error(`Negative case '${neg.case}' was unexpectedly accepted by ${neg.schema}`);
    }
    checks.push(`negative:${neg.case}`);
  }

  // 6. Validate internal $ref integrity in OpenAPI & AsyncAPI contracts
  for (const contractPath of [
    "contracts/openapi.json",
    "contracts/gallery-openapi.json",
    "contracts/asyncapi.json",
  ]) {
    const doc = readJson(contractPath);
    walkRefs(doc, doc);
    checks.push(`internal_refs:${contractPath}`);
  }

  // 7. Verify 28 specification documents (00_*.md ~ 27_*.md)
  const mdDocs = fs
    .readdirSync(DOCS_ROOT)
    .filter((f) => /^[0-2][0-9]_.*\.md$/.test(f));
  if (mdDocs.length !== 28) {
    throw new Error(`Expected 28 numbered markdown docs, found ${mdDocs.length}`);
  }
  checks.push("28_markdown_docs");

  // 8. Verify 6 multi-agent bundles reference valid catalog agent_ids
  const bundles = readJson("gallery/catalog/bundles.json") as Array<{
    bundle_id: string;
    agent_ids: string[];
  }>;
  for (const b of bundles) {
    for (const aid of b.agent_ids) {
      if (!agentIds.has(aid)) {
        throw new Error(`Bundle ${b.bundle_id} references unknown agent_id ${aid}`);
      }
    }
  }
  checks.push("6_bundles_valid_agent_refs");

  console.log(
    JSON.stringify({
      status: "PASS",
      core_schemas: coreCount,
      gallery_schemas: Object.keys(V2_GALLERY_SCHEMAS).length,
      checks: checks.length,
      catalog: 36,
      packs: 12,
      benchmark_inputs: 36,
      documents: 28,
    })
  );
}

main();
