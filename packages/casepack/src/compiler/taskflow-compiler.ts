/**
 * TASKFLOW-CX 2.0 Compiler (`A, S, T, K, W, F, L, O` + `PersonaProfile`)
 *
 * Implements D05_TASKFLOW_CX_2_0_SPEC.md, D22_PERSONA_PACK_AND_FORK_ENGINE.md,
 * T04_RUNTIME_AND_EVALUATION.md, GX02_PILOT_PACKS_AND_PERSONAS.md, and AT14:
 * - Compiles canonical `CasePackDefinition` (and optional `TaskflowCX20` + `PersonaProfile`)
 *   into a deterministic `CompiledTaskflowPlan`
 * - Rejects unsupported tools/capabilities at compile/publish time (`AT14`)
 * - Enforces `real_person_impersonation === false` (`GT02`)
 */

import {
  AppError,
  AppErrorCode,
  CasePackDefinitionSchema,
  PersonaProfileSchema,
  type CasePackDefinition,
  type PersonaProfile,
} from "@cognitive-forge/core";
import { adaptLegacyTaskflow, type TaskflowCX20 } from "./legacy-adapter";

export const PLATFORM_SUPPORTED_TOOLS = [
  "document_parser",
  "document_read",
  "citation_checker",
  "citation_anchor",
  "table_extractor",
  "table_parse",
  "clause_diff",
  "clause_extraction",
  "financial_calculator",
  "policy_lookup",
  "timeline_builder",
  "rubric_scorer",
  "structured_output",
  "risk_flagging",
  "evidence_check",
  "review_gate",
  "fact_check",
  "redaction_guard",
] as const;

export type PlatformSupportedTool = (typeof PLATFORM_SUPPORTED_TOOLS)[number];

export interface CompiledStep {
  index: number;
  id: string;
  kind: "intake" | "retrieve" | "draft" | "verify" | "review" | "publish";
  requires_review: boolean;
}

export interface CompiledTaskflowPlan {
  casepack_id: string;
  version: string;
  actor: string;
  persona_id: string | null;
  system_prompt: string;
  steps: CompiledStep[];
  input_required_fields: string[];
  output_required_sections: string[];
  citation_required: boolean;
  watchouts: string[];
  hard_stops: string[];
  allowed_tools: string[];
}

export interface CompileTaskflowOptions {
  taskflow_cx?: TaskflowCX20;
  persona?: PersonaProfile | null;
  requestedTools?: string[];
  supportedTools?: readonly string[];
}

/**
 * Validates and compiles a `CasePackDefinition` (and optional `TaskflowCX20` + `PersonaProfile`)
 * into an executable `CompiledTaskflowPlan`.
 */
export function compileTaskflow(
  rawCasePack: CasePackDefinition,
  options?: CompileTaskflowOptions
): CompiledTaskflowPlan {
  const casepack = CasePackDefinitionSchema.parse(rawCasePack);
  const persona = options?.persona ? PersonaProfileSchema.parse(options.persona) : null;

  if (persona && persona.real_person_impersonation !== false) {
    throw new AppError(
      AppErrorCode.VALIDATION_FAILED,
      "Real person impersonation is strictly prohibited in PersonaProfile",
      { persona_id: persona.persona_id }
    );
  }

  // Extract requested tools from options or step declarations
  const stepTools = casepack.steps.flatMap((s) => {
    const tools = (s as Record<string, unknown>).tools;
    return Array.isArray(tools) ? (tools as string[]) : [];
  });
  const requestedTools = options?.requestedTools ?? stepTools;
  const supportedSet = new Set(options?.supportedTools ?? PLATFORM_SUPPORTED_TOOLS);
  const unsupportedTools = requestedTools.filter((tool) => !supportedSet.has(tool));
  if (unsupportedTools.length > 0) {
    throw new AppError(
      AppErrorCode.UNPROCESSABLE_ENTITY,
      `Unsupported tool capability requested: ${unsupportedTools.join(", ")}`,
      { unsupported_tools: unsupportedTools }
    );
  }

  const tf: TaskflowCX20 =
    options?.taskflow_cx ??
    adaptLegacyTaskflow({
      T_task: casepack.task,
      F: {
        steps: casepack.steps.map((s, idx) => {
          const rec = s as Record<string, unknown>;
          const rawKind = String(rec.type ?? rec.kind ?? "draft");
          const kind =
            rawKind === "intake" ||
            rawKind === "retrieve" ||
            rawKind === "draft" ||
            rawKind === "verify" ||
            rawKind === "review" ||
            rawKind === "publish"
              ? rawKind
              : "draft";
          return {
            id: String(rec.step_id ?? rec.id ?? `step_${idx + 1}`),
            kind,
            requires_review: Boolean(rec.requires_review),
          };
        }),
      },
    }).taskflow_cx;

  const { A, S, T, K, W, F, L, O } = tf;

  const inputRequired = Array.isArray((casepack.input_schema as Record<string, unknown>).required)
    ? ((casepack.input_schema as Record<string, unknown>).required as string[])
    : [];

  const contractRequired = Array.isArray((casepack.output_schema as Record<string, unknown>).required)
    ? ((casepack.output_schema as Record<string, unknown>).required as string[])
    : [];

  const outputSections = Array.from(new Set([...O.required_sections, ...contractRequired]));

  const promptSections: string[] = [
    `# TASKFLOW-CX 2.0 EXECUTION CONTRACT`,
    `[A: ACTOR & AUTHORITY]`,
    `Actor: ${A.actor}`,
    `Authority: ${A.authority.join(", ")}`,
    `Escalation Triggers: ${A.escalation.join(", ")}`,
    ``,
    `[S: SITUATION & CONSTRAINTS]`,
    `Trigger: ${S.trigger}`,
    `Context: ${S.context}`,
    `Constraints: ${S.constraints.join(", ")}`,
    ``,
    `[T: PRIMARY TASK & SUCCESS CRITERIA]`,
    `Primary Task: ${T.primary_task}`,
    `Success Criteria: ${T.success_criteria.join("; ")}`,
    ``,
    `[K: KNOWLEDGE PARTITION]`,
    `K_REF (Reference): ${K.K_REF.join(", ")}`,
    `K_EX (Examples): ${K.K_EX.join(", ")}`,
    `K_IN (Runtime Inputs): ${K.K_IN.join(", ")}`,
    ``,
    `[W: WATCHOUTS & HARD STOPS]`,
    `Watchouts: ${W.watchouts.join("; ")}`,
    `Hard Stops: ${W.hard_stops.join("; ")}`,
    ``,
    `[F: EXECUTION FLOW]`,
    ...F.steps.map(
      (s, i) => `${i + 1}. ${s.id} (${s.kind})${s.requires_review ? " [REQUIRES_HUMAN_REVIEW]" : ""}`
    ),
    ``,
    `[L: LANGUAGE & STYLE]`,
    `Language: ${L.language} | Tone: ${L.tone}`,
    `Style Rules: ${L.style_rules.join("; ")}`,
    ``,
    `[O: OUTPUT CONTRACT]`,
    `Artifact Type: ${O.artifact_type}`,
    `Required Sections: ${outputSections.join(", ")}`,
    `Citation Required: ${O.citation_required ? "YES" : "NO"}`,
  ];

  if (persona) {
    promptSections.push(
      ``,
      `[PERSONA PROFILE: ${persona.persona_id}]`,
      `Role: ${persona.role}`,
      `Audience: ${persona.audience}`,
      `Behavior Rules: ${persona.behavior_rules.join("; ")}`,
      `Prohibited Claims: ${persona.prohibited_claims.join("; ")}`
    );
  }

  return {
    casepack_id: casepack.pack_id,
    version: casepack.version,
    actor: A.actor,
    persona_id: persona?.persona_id ?? null,
    system_prompt: promptSections.join("\n"),
    steps: F.steps.map((step, index) => ({
      index,
      id: step.id,
      kind: step.kind,
      requires_review: step.requires_review,
    })),
    input_required_fields: inputRequired,
    output_required_sections: outputSections,
    citation_required: O.citation_required,
    watchouts: W.watchouts,
    hard_stops: [
      ...W.hard_stops,
      ...(persona ? persona.prohibited_claims : []),
    ],
    allowed_tools: requestedTools.length > 0 ? requestedTools : ["document_parser", "citation_checker"],
  };
}
