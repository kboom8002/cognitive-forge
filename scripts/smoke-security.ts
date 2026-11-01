#!/usr/bin/env tsx
/**
 * scripts/smoke-security.ts
 *
 * Verifies no-leak security guarantees across all public sanitizers:
 *   - FORBIDDEN_PUBLIC_KEYS completeness
 *   - deepSanitize recursive stripping
 *   - sanitizePublicOutput contract whitelisting + forbidden key rejection
 *   - sanitizeGraphRunResult stripping of internal node_results/tokens
 *   - sanitizeTrustSignals & buildSafeBuilderSummary safety
 *
 * Usage:
 *   pnpm smoke:security
 */

import { FORBIDDEN_PUBLIC_KEYS, deepSanitize } from "@cognitive-forge/validation";
import {
  sanitizePublicOutput,
  sanitizeGraphRunResult,
  sanitizeTrustSignals,
  buildSafeBuilderSummary,
} from "@cognitive-forge/runtime";
import type { OutputContract } from "@cognitive-forge/core";

function deepScanForForbiddenKeys(obj: unknown, path = "root"): string[] {
  const leaks: string[] = [];
  if (obj === null || typeof obj !== "object") return leaks;
  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => leaks.push(...deepScanForForbiddenKeys(item, `${path}[${idx}]`)));
    return leaks;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (FORBIDDEN_PUBLIC_KEYS.includes(k)) {
      leaks.push(`${path}.${k}`);
    }
    leaks.push(...deepScanForForbiddenKeys(v, `${path}.${k}`));
  }
  return leaks;
}

async function main(): Promise<void> {
  console.log("\n🛡️  Cognitive Forge — Security Smoke Check\n");

  // 1. Verify FORBIDDEN_PUBLIC_KEYS has all 14 mandated keys
  const requiredForbidden = [
    "casepack_json",
    "manifest_json",
    "graph_json",
    "taskflow_cx",
    "K_REF",
    "runtime_contract",
    "model_policy",
    "bridge_output_json",
    "source_output_json",
    "target_input_json",
    "context_checkpoint_json",
    "trace_payload",
    "repair_attempts",
    "execution_plan",
  ];
  for (const key of requiredForbidden) {
    if (!FORBIDDEN_PUBLIC_KEYS.includes(key)) {
      throw new Error(`Missing required forbidden key: ${key}`);
    }
  }
  console.log(`  ✅ FORBIDDEN_PUBLIC_KEYS verified (${FORBIDDEN_PUBLIC_KEYS.length} keys)`);

  // 2. Verify deepSanitize strips all forbidden keys at any nesting depth
  const poisoned: Record<string, unknown> = {
    safe_title: "Public App",
    nested: {
      safe_nested: "ok",
      items: [{ ok: true, execution_plan: "SECRET", K_REF: "SECRET" }],
    },
  };
  for (const key of FORBIDDEN_PUBLIC_KEYS) {
    poisoned[key] = "TOP_SECRET_INTERNAL_DATA";
  }

  const sanitized = deepSanitize(poisoned);
  const leaks = deepScanForForbiddenKeys(sanitized);
  if (leaks.length > 0) {
    throw new Error(`deepSanitize leaked forbidden keys: ${leaks.join(", ")}`);
  }
  console.log("  ✅ deepSanitize stripped all top-level and nested forbidden keys");

  // 3. Verify sanitizePublicOutput only keeps whitelisted public_fields
  const contract: OutputContract = {
    fields: [
      { key: "headline", type: "text", label: "Headline" },
      { key: "internal_notes", type: "text", label: "Internal" },
    ],
    required_fields: ["headline"],
    public_fields: ["headline"],
  };
  const publicOut = sanitizePublicOutput(
    {
      headline: "Public Headline",
      internal_notes: "Should be stripped",
      taskflow_cx: "Should be stripped",
    },
    contract
  );
  if ("internal_notes" in publicOut || "taskflow_cx" in publicOut || publicOut["headline"] !== "Public Headline") {
    throw new Error("sanitizePublicOutput failed whitelist check");
  }
  console.log("  ✅ sanitizePublicOutput enforced public_fields whitelist");

  // 4. Verify sanitizeGraphRunResult + trust_signals + builder_summary have zero leaks
  const trustSignals = sanitizeTrustSignals({
    validation: { valid: true, status: "pass", errors: [], checked_at: new Date().toISOString() },
    repairAttempts: 1,
    fallbackUsed: false,
  });
  const builderSummary = buildSafeBuilderSummary({
    status: "success",
    completedNodeCount: 3,
    totalNodeCount: 3,
    bridgeStatuses: ["valid", "valid"],
    validationPassed: true,
    repairedCount: 0,
  });
  const publicGraphResult = sanitizeGraphRunResult(
    {
      graph_run_id: "run-123",
      status: "success",
      final_output: { headline: "Clean Output", trace_payload: "LEAK" },
      validation: { valid: true, status: "pass", errors: [], checked_at: new Date().toISOString() },
      node_results: [
        {
          node_id: "n1",
          casepack_key: "cp.1",
          status: "success",
          output: { secret: "internal" },
          tokens_in: 100,
          tokens_out: 200,
          repair_attempts: 2,
        },
      ],
      total_tokens_in: 100,
      total_tokens_out: 200,
      total_repair_attempts: 2,
      completed_nodes: ["n1"],
    },
    contract,
    { trustSignals, builderSummary }
  );

  const graphLeaks = deepScanForForbiddenKeys(publicGraphResult);
  if (graphLeaks.length > 0 || "node_results" in publicGraphResult || "total_tokens_in" in publicGraphResult) {
    throw new Error("sanitizeGraphRunResult leaked internal telemetry");
  }
  console.log("  ✅ sanitizeGraphRunResult + TrustSignals + BuilderSummary verified leak-free");

  console.log("\n✅ All security smoke checks passed.\n");
}

main().catch((err) => {
  console.error("\n💥 Security smoke check failed:", err);
  process.exit(1);
});
