/**
 * SupabaseTraceStore + SupabaseUsageStore — runtime telemetry persistence.
 *
 * Implements ITraceStore and IUsageStore from @cognitive-forge/runtime,
 * writing to runtime_trace_events and usage_events tables.
 *
 * Lives in apps/web — the only layer allowed to import Supabase directly.
 * The trace_payload column is FORBIDDEN for public API responses.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ITraceStore, IUsageStore, TraceRecord, UsageRecord } from "@cognitive-forge/runtime";
import { AppError, AppErrorCode } from "@cognitive-forge/core";

function assertNoError(error: unknown, context: string): void {
  if (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new AppError(AppErrorCode.INTERNAL_ERROR, `${context}: ${msg}`);
  }
}

// ── SupabaseTraceStore ────────────────────────────────────────────────────────

export class SupabaseTraceStore implements ITraceStore {
  constructor(private readonly db: SupabaseClient) {}

  async write(event: TraceRecord): Promise<void> {
    const { error } = await this.db
      .from("runtime_trace_events")
      .insert({
        run_id:        event.run_id,
        run_type:      event.run_type,
        event_type:    event.event_type,
        casepack_key:  event.casepack_key ?? null,
        node_id:       event.node_id      ?? null,
        trace_payload: event.trace_payload,
        sequence:      event.sequence,
        created_at:    event.created_at,
      });
    assertNoError(error, "SupabaseTraceStore.write");
  }
}

// ── SupabaseUsageStore ────────────────────────────────────────────────────────

export class SupabaseUsageStore implements IUsageStore {
  constructor(private readonly db: SupabaseClient) {}

  async write(event: UsageRecord): Promise<void> {
    const { error } = await this.db
      .from("usage_events")
      .insert({
        run_id:          event.run_id,
        workspace_id:    event.workspace_id,
        casepack_key:    event.casepack_key  ?? null,
        graph_key:       event.graph_key     ?? null,
        provider:        event.provider,
        model:           event.model,
        tokens_in:       event.tokens_in,
        tokens_out:      event.tokens_out,
        cost_usd:        event.cost_usd      ?? null,
        repair_attempts: event.repair_attempts,
        created_at:      event.created_at,
      });
    assertNoError(error, "SupabaseUsageStore.write");
  }
}
