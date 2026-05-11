/**
 * TraceWriter — emits RuntimeTraceEvent records to an injected store.
 *
 * Each method corresponds to a TRACE_EVENT_TYPE from @cognitive-forge/core.
 * Events are assigned a monotonically-increasing sequence number per run_id.
 *
 * The store interface (ITraceStore) is implemented in apps/web with Supabase.
 * This module must NOT import Supabase directly.
 *
 * ISOLATION: No React, Next.js, Supabase, or apps/web imports.
 */

// ── Store interface ───────────────────────────────────────────────────────────

/**
 * Minimal store interface for persisting runtime trace events.
 * Implemented by SupabaseTraceStore in apps/web.
 */
export interface ITraceStore {
  write(event: TraceRecord): Promise<void>;
}

/** The record shape written to the store. Mirrors runtime_trace_events table. */
export interface TraceRecord {
  run_id:        string;
  run_type:      "casepack" | "graph";
  event_type:    string;
  casepack_key?: string | undefined;
  node_id?:      string | undefined;
  trace_payload: Record<string, unknown>;
  sequence:      number;
  created_at:    string;
}

// ── TraceWriter ───────────────────────────────────────────────────────────────

export class TraceWriter {
  /** Monotonically increasing sequence counter per TraceWriter instance. */
  private seq = 0;

  constructor(
    private readonly store: ITraceStore,
    private readonly runType: "casepack" | "graph" = "casepack"
  ) {}

  private async emit(
    runId: string,
    eventType: string,
    payload: Record<string, unknown>,
    casepackKey?: string | undefined,
    nodeId?: string | undefined
  ): Promise<void> {
    const record: TraceRecord = {
      run_id:        runId,
      run_type:      this.runType,
      event_type:    eventType,
      ...(casepackKey !== undefined ? { casepack_key: casepackKey } : {}),
      ...(nodeId      !== undefined ? { node_id: nodeId }           : {}),
      trace_payload: payload,
      sequence:      this.seq++,
      created_at:    new Date().toISOString(),
    };
    await this.store.write(record);
  }

  async start(runId: string, casepackKey: string, payload?: Record<string, unknown>): Promise<void> {
    await this.emit(runId, "start", { casepack_key: casepackKey, ...payload }, casepackKey);
  }

  async step(runId: string, payload: Record<string, unknown>, casepackKey?: string): Promise<void> {
    await this.emit(runId, "step", payload, casepackKey);
  }

  async output(runId: string, payload: Record<string, unknown>, casepackKey?: string): Promise<void> {
    await this.emit(runId, "output", payload, casepackKey);
  }

  async repair(runId: string, payload: Record<string, unknown>, casepackKey?: string): Promise<void> {
    await this.emit(runId, "repair", payload, casepackKey);
  }

  async fallback(runId: string, payload: Record<string, unknown>, casepackKey?: string): Promise<void> {
    await this.emit(runId, "fallback", payload, casepackKey);
  }

  async complete(runId: string, payload: Record<string, unknown>, casepackKey?: string): Promise<void> {
    await this.emit(runId, "complete", payload, casepackKey);
  }

  async error(runId: string, payload: Record<string, unknown>, casepackKey?: string): Promise<void> {
    await this.emit(runId, "error", payload, casepackKey);
  }

  /** Returns the current sequence counter (useful for testing). */
  get currentSequence(): number {
    return this.seq;
  }
}
