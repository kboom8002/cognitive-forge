import type { TraceRecord } from "./trace-writer";

export interface PublicTraceSummary {
  id: string;
  timestamp: string;
  label: string;
  status: "success" | "running" | "error" | "warning";
  details?: Record<string, unknown> | undefined;
}

export class TraceSummaryBuilder {
  /**
   * Builds a safe, human-readable summary for public users.
   * Excludes internal steps (plan_built) and strips ALL payloads.
   */
  static buildPublicSummary(records: TraceRecord[]): PublicTraceSummary[] {
    const summary: PublicTraceSummary[] = [];

    // Sort by sequence just in case
    const sorted = [...records].sort((a, b) => a.sequence - b.sequence);

    for (const r of sorted) {
      const phase = r.trace_payload?.phase as string | undefined;
      let label = "";
      let status: PublicTraceSummary["status"] = "success";

      if (r.event_type === "start") {
        label = "Run Started";
      } else if (r.event_type === "complete") {
        label = "Run Completed";
      } else if (r.event_type === "error") {
        label = "Error Encountered";
        status = "error";
        if (phase === "node_failed") label = `Node Failed: ${r.trace_payload.node_id || "Unknown"}`;
      } else if (phase) {
        // Internal steps to skip for public
        if (phase === "plan_built") continue;
        
        switch (phase) {
          case "input_validated": label = "Input Validated"; break;
          case "node_start": 
            label = `Executing Node: ${r.trace_payload.node_id || r.node_id || "Unknown"}`; 
            status = "running";
            break;
          case "node_complete": label = `Node Completed: ${r.trace_payload.node_id || r.node_id || "Unknown"}`; break;
          case "bridge_start": label = "Initiating Bridge Handoff"; status = "running"; break;
          case "bridge_complete": label = "Bridge Handoff Completed"; break;
          case "ai_output_received": label = "AI Output Received"; break;
          case "output_validated": label = "Output Validated"; break;
          case "repair_attempt": label = "Attempting Output Repair"; status = "warning"; break;
          case "repair_success": label = "Repair Successful"; break;
          case "repair_exhausted": label = "Repair Exhausted"; status = "error"; break;
          case "fallback_executed": label = "Fallback Executed"; status = "warning"; break;
          default: label = formatPhaseName(phase); break;
        }
      } else {
        label = formatPhaseName(r.event_type);
      }

      summary.push({
        id: `event-${r.sequence}`,
        timestamp: r.created_at,
        label,
        status,
        // No details in public mode
      });
    }

    return summary;
  }

  /**
   * Builds a richer summary for builder/operator mode.
   * Includes internal steps (plan_built, tokens) but STRIPS raw text/secrets.
   */
  static buildBuilderSummary(records: TraceRecord[]): PublicTraceSummary[] {
    const summary: PublicTraceSummary[] = [];
    const sorted = [...records].sort((a, b) => a.sequence - b.sequence);

    for (const r of sorted) {
      const phase = r.trace_payload?.phase as string | undefined;
      let label = "";
      let status: PublicTraceSummary["status"] = "success";
      let details: Record<string, unknown> | undefined = undefined;

      // Extract safe details
      const safeDetails: Record<string, unknown> = {};
      const unsafeKeys = ["raw_text", "secret_payload", "prompt", "completion"];
      
      for (const [key, value] of Object.entries(r.trace_payload)) {
        if (!unsafeKeys.includes(key) && key !== "phase") {
          safeDetails[key] = value;
        }
      }
      
      if (Object.keys(safeDetails).length > 0) {
        details = safeDetails;
      }

      if (r.event_type === "start") {
        label = "Run Started";
      } else if (r.event_type === "complete") {
        label = "Run Completed";
      } else if (r.event_type === "error") {
        label = "Error Encountered";
        status = "error";
      } else if (phase) {
        switch (phase) {
          case "input_validated": label = "Input Validated"; break;
          case "plan_built": label = "Execution Plan Built"; break;
          case "node_start": label = `Node Started: ${r.trace_payload.node_id || r.node_id || "Unknown"}`; status = "running"; break;
          case "node_complete": label = `Node Completed: ${r.trace_payload.node_id || r.node_id || "Unknown"}`; break;
          case "bridge_start": label = "Bridge Handoff Started"; status = "running"; break;
          case "bridge_complete": label = "Bridge Handoff Completed"; break;
          case "ai_output_received": label = "AI Output Received"; break;
          case "output_validated": label = "Output Validated"; break;
          case "repair_attempt": label = "Repair Attempt"; status = "warning"; break;
          case "repair_success": label = "Repair Success"; break;
          case "repair_exhausted": label = "Repair Exhausted"; status = "error"; break;
          case "fallback_executed": label = "Fallback Executed"; status = "warning"; break;
          default: label = formatPhaseName(phase); break;
        }
      } else {
        label = formatPhaseName(r.event_type);
      }

      const entry: PublicTraceSummary = {
        id: `event-${r.sequence}`,
        timestamp: r.created_at,
        label,
        status,
      };
      if (details !== undefined) {
        entry.details = details;
      }
      summary.push(entry);
    }

    return summary;
  }
}

function formatPhaseName(phase: string): string {
  return phase
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
