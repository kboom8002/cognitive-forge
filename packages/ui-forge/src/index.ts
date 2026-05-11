/**
 * @cognitive-forge/ui-forge
 *
 * Contract-driven UI components for CasePack and Graph apps.
 *
 * ISOLATION RULES (enforced at review):
 *   ✓ May import @cognitive-forge/core
 *   ✓ May import React (peer dependency)
 *   ✗ Must NOT import @cognitive-forge/runtime or @cognitive-forge/bridge
 *   ✗ Must NOT import Next.js server APIs
 *   ✗ Must NOT import apps/web
 */

export { CORE_VERSION } from "@cognitive-forge/core";

/** Package version sentinel. */
export const UI_FORGE_VERSION = "0.1.0" as const;

// ── Form renderer ─────────────────────────────────────────────────────────────

export { FieldRenderer }        from "./form-renderer/FieldRenderer";
export type { FieldRendererProps } from "./form-renderer/FieldRenderer";

export { DynamicForm, validateRequired, getFieldsInOrder }
                                from "./form-renderer/DynamicForm";
export type { DynamicFormProps, FormValues, FieldValue }
                                from "./form-renderer/DynamicForm";

// ── Output renderer ───────────────────────────────────────────────────────────

export { OutputFieldRenderer }      from "./output-renderer/OutputFieldRenderer";
export type { OutputFieldRendererProps, OutputValue }
                                    from "./output-renderer/OutputFieldRenderer";

export { OutputCard }               from "./output-renderer/OutputCard";
export type { OutputCardProps }     from "./output-renderer/OutputCard";

export { OutputActions }            from "./output-renderer/OutputActions";
export type { OutputActionsProps }  from "./output-renderer/OutputActions";

// ── Graph progress ────────────────────────────────────────────────────────────

export { GraphStepper } from "./progress/GraphStepper";
export { RuntimeTraceTimeline } from "./trace/RuntimeTraceTimeline";
export type { GraphStepperProps, GraphStep, StepStatus }
                                    from "./progress/GraphStepper";

// ── Composite app renderer ────────────────────────────────────────────────────

export { CompositeAppRenderer }     from "./composite/CompositeAppRenderer";
export type {
  CompositeAppRendererProps,
  CompositeRunState,
  PublicGraphRunResult,
  PublicGraphNode,
}                                   from "./composite/CompositeAppRenderer";

// ── Bridge builder components ─────────────────────────────────────────────────

export { BridgeCompatibilityPanel } from "./bridge/BridgeCompatibilityPanel";
export type { BridgeCompatibilityPanelProps } from "./bridge/BridgeCompatibilityPanel";

// ── Trust signal components ───────────────────────────────────────────────────

export { TrustSignalPanel } from "./output-renderer/TrustSignalPanel";
export type { TrustSignalPanelProps } from "./output-renderer/TrustSignalPanel";

// ── Builder Inspection ────────────────────────────────────────────────────────

export { BuilderInspectionPanel } from "./builder/BuilderInspectionPanel";
export type { BuilderInspectionPanelProps, BuilderInspectionSummary } from "./builder/BuilderInspectionPanel";
