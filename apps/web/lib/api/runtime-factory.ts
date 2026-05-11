/**
 * RuntimeFactory — wires the full runtime pipeline for public CasePack and
 * Graph app runs.
 *
 * Creates all injected dependencies:
 *   - MockAIProvider (Sprint 06/07) loaded from mock-output-map.json
 *   - SupabaseRunStore
 *   - SupabaseTraceStore → TraceWriter
 *   - SupabaseUsageStore → UsageWriter
 *   - SupabaseGraphRunStore (for SequentialGraphRunner)
 *
 * Used by:
 *   - POST /api/public/apps/:slug/run       (single CasePack)
 *   - POST /api/public/apps/:slug/graph-run  (graph)
 *
 * ISOLATION: This file may import Supabase and runtime. May NOT import UI Forge.
 *
 * NOTE: Real OpenAI/Anthropic adapters will replace MockAIProvider in Sprint 08.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MockAIProvider,
  TraceWriter,
  UsageWriter,
  MOCK_OUTPUT_MAP,
} from "@cognitive-forge/runtime";
import type {
  AIProviderAdapter,
  IRunStore,
  IGraphRunStore,
} from "@cognitive-forge/runtime";
import { SupabaseRunStore }    from "../supabase/run-store";
import { SupabaseTraceStore, SupabaseUsageStore } from "../supabase/telemetry-stores";
import { SupabaseGraphRunStore } from "../supabase/graph-run-store";

// ── System workspace ID ───────────────────────────────────────────────────────

/**
 * System workspace used for public (unauthenticated) runs.
 * Falls back to a sentinel UUID if the env var is not set.
 */
const SYSTEM_WORKSPACE_ID =
  process.env.SYSTEM_WORKSPACE_ID ?? "00000000-0000-0000-0000-000000000000";

// ── Runtime context factory ───────────────────────────────────────────────────

export interface RuntimeComponents {
  adapter:      AIProviderAdapter;
  runStore:     IRunStore;
  traceWriter:  TraceWriter;
  usageWriter:  UsageWriter;
  workspaceId:  string;
}

export interface GraphRuntimeComponents extends RuntimeComponents {
  /** IGraphRunStore for creating/updating graph_runs rows. */
  graphRunStore:    IGraphRunStore;
  /** TraceWriter with run_type="graph" for graph-level trace events. */
  graphTraceWriter: TraceWriter;
}

/**
 * Creates all runtime components for a single CasePack run.
 * Used by POST /api/public/apps/:slug/run.
 *
 * @param db - Service-role Supabase client (no RLS).
 */
export function createRuntimeComponents(db: SupabaseClient): RuntimeComponents {
  const adapter      = new MockAIProvider(MOCK_OUTPUT_MAP, 0);
  const runStore     = new SupabaseRunStore(db);
  const traceStore   = new SupabaseTraceStore(db);
  const usageStore   = new SupabaseUsageStore(db);
  const traceWriter  = new TraceWriter(traceStore, "casepack");
  const usageWriter  = new UsageWriter(usageStore);

  return { adapter, runStore, traceWriter, usageWriter, workspaceId: SYSTEM_WORKSPACE_ID };
}

/**
 * Creates runtime components for SequentialGraphRunner.
 * Extends casepack components with IGraphRunStore + graph-typed TraceWriter.
 * Used by POST /api/public/apps/:slug/graph-run.
 *
 * @param db - Service-role Supabase client (no RLS).
 */
export function createGraphRuntimeComponents(db: SupabaseClient): GraphRuntimeComponents {
  const base            = createRuntimeComponents(db);
  const graphRunStore   = new SupabaseGraphRunStore(db);
  // Use a fresh trace store for graph-level events (run_type="graph")
  const graphTraceStore = new SupabaseTraceStore(db);
  const graphTraceWriter = new TraceWriter(graphTraceStore, "graph");

  return { ...base, graphRunStore, graphTraceWriter };
}
