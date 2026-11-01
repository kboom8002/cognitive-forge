#!/usr/bin/env tsx
/**
 * scripts/smoke-runtime.ts
 *
 * End-to-end in-memory smoke test of SingleCasePackRunner and SequentialGraphRunner
 * using MockAIProvider + real fixture contracts from docs/fixtures/.
 *
 * Usage:
 *   pnpm smoke:runtime
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { glob } from "glob";
import type { CasePackMAO, BridgeCasePack, CasePackGraph, InputField } from "@cognitive-forge/core";
import {
  MockAIProvider,
  MOCK_OUTPUT_MAP,
  TraceWriter,
  UsageWriter,
  runSingleCasePack,
  runSequentialGraph,
} from "@cognitive-forge/runtime";
import type {
  IRunStore,
  IGraphRunStore,
  INodeRunStore,
  IValidationStore,
} from "@cognitive-forge/runtime";
import type { IHandoffEventStore } from "@cognitive-forge/bridge";

const ROOT = path.resolve(process.cwd());

function buildSampleInput(fields: readonly InputField[]): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.type === "select") {
      input[field.key] = field.options?.[0] ?? "default";
    } else if (field.type === "number") {
      input[field.key] = field.min ?? 1;
    } else if (field.type === "boolean") {
      input[field.key] = true;
    } else {
      const minLen = field.min_length ?? 10;
      const base = `Sample smoke test input for ${field.key}. `;
      input[field.key] = base.repeat(Math.ceil((minLen + 10) / base.length));
    }
  }
  return input;
}

async function main(): Promise<void> {
  console.log("\n🔥 Cognitive Forge — Runtime Smoke Check\n");

  const maoMap = new Map<string, CasePackMAO>();
  const bridgeMap = new Map<string, BridgeCasePack>();
  const graphList: CasePackGraph[] = [];

  for (const file of await glob("docs/fixtures/casepacks/**/*.json", { cwd: ROOT, absolute: true })) {
    const mao = JSON.parse(readFileSync(file, "utf-8")) as CasePackMAO;
    maoMap.set(mao.key, mao);
  }
  for (const file of await glob("docs/fixtures/bridges/**/*.json", { cwd: ROOT, absolute: true })) {
    const bridge = JSON.parse(readFileSync(file, "utf-8")) as BridgeCasePack;
    bridgeMap.set(bridge.key, bridge);
  }
  for (const file of await glob("docs/fixtures/graphs/**/*.json", { cwd: ROOT, absolute: true })) {
    const graph = JSON.parse(readFileSync(file, "utf-8")) as CasePackGraph;
    graphList.push(graph);
  }

  let runCounter = 0;
  const runStore: IRunStore = {
    create: async () => `run-${++runCounter}`,
    update: async () => {},
  };
  const graphRunStore: IGraphRunStore = {
    create: async () => `graph-run-${++runCounter}`,
    update: async () => {},
  };
  const nodeRunStore: INodeRunStore = {
    write: async () => {},
  };
  const validationStore: IValidationStore = {
    write: async () => {},
  };
  const handoffEventStore: IHandoffEventStore = {
    write: async () => {},
  };
  const traceWriter = new TraceWriter({ write: async () => {} }, "casepack");
  const graphTraceWriter = new TraceWriter({ write: async () => {} }, "graph");
  const usageWriter = new UsageWriter({ write: async () => {} });
  const adapter = new MockAIProvider(MOCK_OUTPUT_MAP, 0);

  // 1. Single CasePack smoke test
  const sampleMao = maoMap.get("casepack.book_intake.v1") ?? Array.from(maoMap.values())[0];
  if (!sampleMao) {
    throw new Error("No CasePack fixtures found");
  }

  const singleInput = buildSampleInput(sampleMao.input_contract.fields);
  const singleResult = await runSingleCasePack({
    workspace_id: "00000000-0000-0000-0000-000000000000",
    casepack_key: sampleMao.key,
    mao: sampleMao,
    user_input: singleInput,
    adapter,
    traceWriter,
    usageWriter,
    runStore,
    validationStore,
    publicMode: true,
  });

  if (singleResult.status !== "success") {
    throw new Error(`Single CasePack smoke run failed with status: ${singleResult.status}`);
  }
  console.log(`  ✅ SingleCasePackRunner passed (${sampleMao.key}) — tokens: ${singleResult.tokens_in}/${singleResult.tokens_out}`);

  // 2. Sequential Graph smoke tests across all graph fixtures
  for (const graph of graphList) {
    const entryNode = graph.nodes.find((n) => n.id === graph.entry_node);
    const entryMao = entryNode ? maoMap.get(entryNode.casepack_key) : undefined;
    if (!entryMao) {
      throw new Error(`Entry MAO missing for graph ${graph.key}`);
    }

    const graphInput = buildSampleInput(entryMao.input_contract.fields);
    const graphResult = await runSequentialGraph({
      graph,
      maoMap,
      bridgeMap,
      userInput: graphInput,
      adapter,
      traceWriter: graphTraceWriter,
      usageWriter,
      runStore,
      graphRunStore,
      nodeRunStore,
      validationStore,
      handoffEventStore,
      workspace_id: "00000000-0000-0000-0000-000000000000",
      publicMode: true,
    });

    if (graphResult.status !== "success") {
      throw new Error(`SequentialGraphRunner failed for ${graph.key}: ${JSON.stringify(graphResult.validation.errors)}`);
    }
    console.log(
      `  ✅ SequentialGraphRunner passed (${graph.key}) — nodes: ${graphResult.completed_nodes.length}, tokens: ${graphResult.total_tokens_in}/${graphResult.total_tokens_out}`
    );
  }

  console.log("\n✅ All runtime smoke checks passed.\n");
}

main().catch((err) => {
  console.error("\n💥 Runtime smoke check failed:", err);
  process.exit(1);
});
