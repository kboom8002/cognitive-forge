export interface BuilderInspectionSummary {
  casepack_keys?: string[];
  graph_key?: string;
  bridges?: any[];
  validation_status?: string;
  trace_events?: any[];
  contracts?: {
    input?: Record<string, any>;
    output?: Record<string, any>;
  };
}

/**
 * Extracts ONLY safe metadata for builder inspection.
 * Explicitly drops any secrets, API keys, or raw system prompts.
 */
export function buildSafeBuilderSummary(rawContext: Record<string, any>): BuilderInspectionSummary {
  return {
    casepack_keys: Array.isArray(rawContext.casepack_keys) ? rawContext.casepack_keys : [],
    graph_key: rawContext.graph_key || undefined,
    bridges: Array.isArray(rawContext.bridges) ? rawContext.bridges : [],
    validation_status: rawContext.validation_status || "unknown",
    trace_events: Array.isArray(rawContext.trace_events) ? rawContext.trace_events : [],
    contracts: rawContext.contracts || {}
  };
}
