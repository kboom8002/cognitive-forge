/**
 * RuntimeTraceEventSchema — a single event in an AI execution trace.
 *
 * Trace events are written by the TraceWriter (packages/runtime) during
 * CasePack or Graph execution. They provide an auditable record of every
 * significant step in the AI pipeline.
 *
 * ISOLATION: trace_payload must not be exposed in public API responses.
 * See FORBIDDEN_PUBLIC_KEYS in packages/validation.
 */

import { z } from "zod";
import {
  UUIDSchema,
  ISODateTimeSchema,
  CasePackKeySchema,
  JsonObjectSchema,
} from "./primitives";

// ── Event type taxonomy ───────────────────────────────────────────────────────

export const TRACE_EVENT_TYPE = {
  START:    "start",      // execution began
  STEP:     "step",       // a processing step completed
  OUTPUT:   "output",     // AI produced output
  REPAIR:   "repair",     // RepairEngine invoked
  FALLBACK: "fallback",   // FallbackHandler invoked
  COMPLETE: "complete",   // execution finished successfully
  ERROR:    "error",      // execution failed
} as const;

export type TraceEventType = (typeof TRACE_EVENT_TYPE)[keyof typeof TRACE_EVENT_TYPE];

// ── Schema ────────────────────────────────────────────────────────────────────

export const RuntimeTraceEventSchema = z.object({
  /** UUID identifying the run this event belongs to. */
  run_id: UUIDSchema,

  /** Type of trace event. */
  event_type: z.enum(
    Object.values(TRACE_EVENT_TYPE) as [string, ...string[]]
  ),

  /** CasePack that produced this event, if applicable. */
  casepack_key: CasePackKeySchema.optional(),

  /** Graph node ID, if this event belongs to a sequential graph run. */
  node_id: z.string().optional(),

  /**
   * Event-specific payload. Content varies by event_type.
   * FORBIDDEN for public API exposure — see FORBIDDEN_PUBLIC_KEYS.
   */
  payload: JsonObjectSchema,

  /** Monotonically increasing sequence number within a run. */
  sequence: z.number().int().nonnegative().optional(),

  /** ISO timestamp when this event occurred. */
  created_at: ISODateTimeSchema,
});

export type RuntimeTraceEvent = z.infer<typeof RuntimeTraceEventSchema>;
