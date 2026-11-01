/**
 * SupabaseTraceStore + SupabaseUsageStore + SupabaseNodeRunStore +
 * SupabaseHandoffEventStore + SupabaseValidationStore — runtime telemetry persistence.
 *
 * Implements store interfaces from @cognitive-forge/runtime and @cognitive-forge/bridge,
 * writing to runtime_trace_events, usage_events, node_runs, handoff_events,
 * and validation_results tables.
 *
 * Lives in apps/web — the only layer allowed to import Supabase directly.
 * FORBIDDEN columns are never exposed to public API responses.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ITraceStore,
  IUsageStore,
  INodeRunStore,
  IValidationStore,
  TraceRecord,
  UsageRecord,
} from "@cognitive-forge/runtime";
import type { IHandoffEventStore, HandoffEvent } from "@cognitive-forge/bridge";
import { AppError, AppErrorCode } from "@cognitive-forge/core";
import type { ValidationReport } from "@cognitive-forge/core";

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

// ── SupabaseNodeRunStore ──────────────────────────────────────────────────────

export class SupabaseNodeRunStore implements INodeRunStore {
  constructor(private readonly db: SupabaseClient) {}

  async write(params: {
    graph_run_id: string;
    node_id:      string;
    casepack_key: string;
    status:       string;
    input_json:   Record<string, unknown>;
    output_json?: Record<string, unknown> | undefined;
    started_at:   string;
    completed_at: string;
  }): Promise<void> {
    const { error } = await this.db
      .from("node_runs")
      .insert({
        graph_run_id: params.graph_run_id,
        node_id:      params.node_id,
        casepack_key: params.casepack_key,
        status:       params.status,
        input_json:   params.input_json,
        output_json:  params.output_json ?? null,
        started_at:   params.started_at,
        completed_at: params.completed_at,
      });
    assertNoError(error, "SupabaseNodeRunStore.write");
  }
}

// ── SupabaseHandoffEventStore ─────────────────────────────────────────────────

export class SupabaseHandoffEventStore implements IHandoffEventStore {
  constructor(private readonly db: SupabaseClient) {}

  async write(event: HandoffEvent): Promise<void> {
    const { error } = await this.db
      .from("handoff_events")
      .insert({
        graph_run_id:            event.graph_run_id,
        source_node_id:          event.source_node_id,
        target_node_id:          event.target_node_id,
        bridge_key:              event.bridge_key,
        source_output_json:      event.source_output_json      ?? null,
        target_input_json:       event.target_input_json       ?? null,
        context_checkpoint_json: event.context_checkpoint_json ?? null,
        bridge_output_json:      event.bridge_output_json      ?? {
          validation_passed: event.validation_passed,
          error_count:       event.error_count,
        },
        created_at:              event.created_at,
      });
    assertNoError(error, "SupabaseHandoffEventStore.write");
  }
}

// ── SupabaseValidationStore ───────────────────────────────────────────────────

export class SupabaseValidationStore implements IValidationStore {
  constructor(private readonly db: SupabaseClient) {}

  async write(params: {
    run_id:   string;
    run_type: "casepack" | "graph" | "node";
    report:   ValidationReport;
  }): Promise<void> {
    const { error } = await this.db
      .from("validation_results")
      .insert({
        run_id:     params.run_id,
        run_type:   params.run_type,
        valid:      params.report.valid,
        status:     params.report.status,
        errors:     params.report.errors,
        warnings:   params.report.warnings ?? [],
        checked_at: params.report.checked_at,
      });
    assertNoError(error, "SupabaseValidationStore.write");
  }
}
