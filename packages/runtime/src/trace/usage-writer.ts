/**
 * UsageWriter — records token consumption and cost per AI execution.
 *
 * Writes a UsageEvent-shaped record to an injected store interface.
 * The store is implemented by SupabaseUsageStore in apps/web.
 *
 * ISOLATION: No React, Next.js, Supabase, or apps/web imports.
 */

// ── Store interface ───────────────────────────────────────────────────────────

/**
 * Minimal store interface for persisting usage events.
 * Implemented by SupabaseUsageStore in apps/web.
 */
export interface IUsageStore {
  write(event: UsageRecord): Promise<void>;
}

/** The record shape written to the store. Mirrors usage_events table. */
export interface UsageRecord {
  run_id:           string;
  workspace_id:     string;
  casepack_key?:    string | undefined;
  graph_key?:       string | undefined;
  provider:         string;
  model:            string;
  tokens_in:        number;
  tokens_out:       number;
  cost_usd?:        number | undefined;
  repair_attempts:  number;
  created_at:       string;
}

// ── UsageWriter ───────────────────────────────────────────────────────────────

export class UsageWriter {
  constructor(private readonly store: IUsageStore) {}

  /**
   * Records a usage event for a completed or failed run.
   */
  async record(params: {
    run_id:           string;
    workspace_id:     string;
    casepack_key?:    string | undefined;
    graph_key?:       string | undefined;
    provider:         string;
    model:            string;
    tokens_in:        number;
    tokens_out:       number;
    cost_usd?:        number | undefined;
    repair_attempts:  number;
  }): Promise<void> {
    const record: UsageRecord = {
      run_id:          params.run_id,
      workspace_id:    params.workspace_id,
      ...(params.casepack_key !== undefined ? { casepack_key: params.casepack_key } : {}),
      ...(params.graph_key    !== undefined ? { graph_key:    params.graph_key }    : {}),
      provider:        params.provider,
      model:           params.model,
      tokens_in:       params.tokens_in,
      tokens_out:      params.tokens_out,
      ...(params.cost_usd !== undefined ? { cost_usd: params.cost_usd } : {}),
      repair_attempts: params.repair_attempts,
      created_at:      new Date().toISOString(),
    };
    await this.store.write(record);
  }
}
