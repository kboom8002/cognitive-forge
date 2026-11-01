/**
 * RuntimeFactory — wires the full runtime pipeline for public CasePack and
 * Graph app runs.
 *
 * Creates all injected dependencies:
 *   - AIProviderAdapter: dynamically resolves OpenAIAdapter / AnthropicAdapter /
 *     GeminiAdapter when AI_PROVIDER + AI_API_KEY are set, falling back to
 *     MockAIProvider loaded from mock-output-map.json.
 *   - SupabaseRunStore
 *   - SupabaseTraceStore → TraceWriter
 *   - SupabaseUsageStore → UsageWriter
 *   - SupabaseValidationStore
 *   - SupabaseGraphRunStore, SupabaseNodeRunStore, SupabaseHandoffEventStore
 *
 * Used by:
 *   - POST /api/public/apps/:slug/run       (single CasePack)
 *   - POST /api/public/apps/:slug/graph-run  (graph)
 *
 * ISOLATION: This file may import Supabase and runtime. May NOT import UI Forge.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MockAIProvider,
  createProvider,
  TraceWriter,
  UsageWriter,
  MOCK_OUTPUT_MAP,
} from "@cognitive-forge/runtime";
import type {
  AIProviderAdapter,
  ProviderName,
  IRunStore,
  IGraphRunStore,
  INodeRunStore,
  IValidationStore,
} from "@cognitive-forge/runtime";
import type { IHandoffEventStore } from "@cognitive-forge/bridge";
import { SupabaseRunStore } from "../supabase/run-store";
import {
  SupabaseTraceStore,
  SupabaseUsageStore,
  SupabaseNodeRunStore,
  SupabaseHandoffEventStore,
  SupabaseValidationStore,
} from "../supabase/telemetry-stores";
import { SupabaseGraphRunStore } from "../supabase/graph-run-store";

// ── System workspace ID ───────────────────────────────────────────────────────

/**
 * System workspace used for public (unauthenticated) runs.
 * Falls back to a sentinel UUID if the env var is not set.
 */
const SYSTEM_WORKSPACE_ID =
  process.env.SYSTEM_WORKSPACE_ID ?? "00000000-0000-0000-0000-000000000000";

// ── Provider resolution ───────────────────────────────────────────────────────

function resolveAIAdapter(): AIProviderAdapter {
  const rawProvider = (process.env.AI_PROVIDER ?? "mock").trim().toLowerCase();
  const apiKey = process.env.AI_API_KEY?.trim();
  const defaultModel = process.env.AI_DEFAULT_MODEL?.trim();

  if (
    (rawProvider === "openai" || rawProvider === "anthropic" || rawProvider === "gemini") &&
    apiKey &&
    apiKey.length > 0
  ) {
    return createProvider(rawProvider as ProviderName, {
      apiKey,
      ...(defaultModel ? { defaultModel } : {}),
    });
  }

  return new MockAIProvider(MOCK_OUTPUT_MAP, 0);
}

// ── Runtime context factory ───────────────────────────────────────────────────

export interface RuntimeComponents {
  adapter:         AIProviderAdapter;
  runStore:        IRunStore;
  traceWriter:     TraceWriter;
  usageWriter:     UsageWriter;
  validationStore: IValidationStore;
  workspaceId:     string;
}

export interface GraphRuntimeComponents extends RuntimeComponents {
  /** IGraphRunStore for creating/updating graph_runs rows. */
  graphRunStore:     IGraphRunStore;
  /** TraceWriter with run_type="graph" for graph-level trace events. */
  graphTraceWriter:  TraceWriter;
  /** INodeRunStore for recording per-node runs in node_runs table. */
  nodeRunStore:      INodeRunStore;
  /** IHandoffEventStore for recording bridge handoffs in handoff_events table. */
  handoffEventStore: IHandoffEventStore;
}

/**
 * Creates all runtime components for a single CasePack run.
 * Used by POST /api/public/apps/:slug/run.
 *
 * @param db - Service-role Supabase client (no RLS).
 */
export function createRuntimeComponents(db: SupabaseClient): RuntimeComponents {
  const adapter         = resolveAIAdapter();
  const runStore        = new SupabaseRunStore(db);
  const traceStore      = new SupabaseTraceStore(db);
  const usageStore      = new SupabaseUsageStore(db);
  const validationStore = new SupabaseValidationStore(db);
  const traceWriter     = new TraceWriter(traceStore, "casepack");
  const usageWriter     = new UsageWriter(usageStore);

  return {
    adapter,
    runStore,
    traceWriter,
    usageWriter,
    validationStore,
    workspaceId: SYSTEM_WORKSPACE_ID,
  };
}

/**
 * Creates runtime components for SequentialGraphRunner.
 * Extends casepack components with IGraphRunStore, INodeRunStore,
 * IHandoffEventStore, and graph-typed TraceWriter.
 * Used by POST /api/public/apps/:slug/graph-run.
 *
 * @param db - Service-role Supabase client (no RLS).
 */
export function createGraphRuntimeComponents(db: SupabaseClient): GraphRuntimeComponents {
  const base              = createRuntimeComponents(db);
  const graphRunStore     = new SupabaseGraphRunStore(db);
  const graphTraceStore   = new SupabaseTraceStore(db);
  const graphTraceWriter  = new TraceWriter(graphTraceStore, "graph");
  const nodeRunStore      = new SupabaseNodeRunStore(db);
  const handoffEventStore = new SupabaseHandoffEventStore(db);

  return {
    ...base,
    graphRunStore,
    graphTraceWriter,
    nodeRunStore,
    handoffEventStore,
  };
}
