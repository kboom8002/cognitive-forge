/**
 * Legacy CasePack-MAO & PilotPack -> v2.0 Canonical CasePackDefinition Adapter
 *
 * Implements D05_TASKFLOW_CX_2_0_SPEC.md & T02_CASEPACK_SCHEMA_AND_ADAPTER.md:
 * - Maps legacy `R_role` -> `taskflow_cx.A.actor` with deprecation warnings (`AT03`)
 * - Normalizes `K_REF`, `K_EX`, `K_IN` into canonical `K` object
 * - Produces a valid `CasePackDefinition` (`pack_id`, `version`, `task`, `input_schema`,
 *   `output_schema`, `steps`, `evaluation_rules`) AND the 8-block `TaskflowCX20` representation
 */

import {
  CasePackDefinitionSchema,
  PersonaProfileSchema,
  PilotPackSchema,
  type CasePackDefinition,
  type CasePackMAO,
  type PersonaProfile,
  type PilotPack,
} from "@cognitive-forge/core";

export interface TaskflowCX20 {
  A: {
    actor: string;
    authority: string[];
    escalation: string[];
  };
  S: {
    trigger: string;
    context: string;
    constraints: string[];
  };
  T: {
    primary_task: string;
    success_criteria: string[];
  };
  K: {
    K_REF: string[];
    K_EX: string[];
    K_IN: string[];
  };
  W: {
    watchouts: string[];
    hard_stops: string[];
  };
  F: {
    steps: Array<{
      id: string;
      kind: "intake" | "retrieve" | "draft" | "verify" | "review" | "publish";
      requires_review: boolean;
    }>;
  };
  L: {
    language: string;
    tone: string;
    style_rules: string[];
  };
  O: {
    artifact_type: string;
    required_sections: string[];
    citation_required: boolean;
  };
}

export interface LegacyAdapterResult {
  casepack: CasePackDefinition;
  taskflow_cx: TaskflowCX20;
  warnings: string[];
}

export interface LegacyTaskflowInput {
  R_role?: string;
  A_actor?: string;
  S_situation?: string;
  T_task?: string;
  K_REF?: string | string[];
  K_EX?: string | string[];
  K_IN?: string | string[];
  W_watchouts?: string | string[];
  F_flow?: string | string[];
  L_language?: string;
  O_output_contract?: string;
  A?: string | Partial<TaskflowCX20["A"]>;
  S?: string | Partial<TaskflowCX20["S"]>;
  T?: string | Partial<TaskflowCX20["T"]>;
  K?: string | Partial<TaskflowCX20["K"]>;
  W?: string | Partial<TaskflowCX20["W"]>;
  F?: string | string[] | Partial<TaskflowCX20["F"]>;
  L?: string | Partial<TaskflowCX20["L"]>;
  O?: string | Partial<TaskflowCX20["O"]>;
}

function toArray(val: string | string[] | undefined, fallback: string[] = []): string[] {
  if (!val) return fallback;
  if (Array.isArray(val)) return val.filter((s) => s.trim().length > 0);
  return val
    .split(/\r?\n|;|→|->/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Adapts a legacy TASKFLOW-CX object (using `R_role`, `S_situation`, etc.) or PilotPack 8-block
 * into the canonical 8-block `TaskflowCX20` structure and emits deprecation warnings (`AT03`).
 */
export function adaptLegacyTaskflow(raw: LegacyTaskflowInput): {
  taskflow_cx: TaskflowCX20;
  warnings: string[];
} {
  const warnings: string[] = [];

  let actor =
    typeof raw.A === "string"
      ? raw.A
      : raw.A?.actor ?? raw.A_actor ?? "";

  if (!actor && raw.R_role) {
    actor = raw.R_role;
    warnings.push("LEGACY_FIELD_MAPPED: R_role -> taskflow_cx.A.actor");
  }
  if (!actor) {
    actor = "Domain Specialist Agent";
  }

  if (raw.S_situation && !raw.S) {
    warnings.push("LEGACY_FIELD_MAPPED: S_situation -> taskflow_cx.S.context");
  }
  if (raw.T_task && !raw.T) {
    warnings.push("LEGACY_FIELD_MAPPED: T_task -> taskflow_cx.T.primary_task");
  }
  if ((raw.K_REF !== undefined || raw.K_EX !== undefined || raw.K_IN !== undefined) && !raw.K) {
    warnings.push("LEGACY_FIELD_MAPPED: K_REF/K_EX/K_IN -> taskflow_cx.K");
  }
  if (raw.W_watchouts && !raw.W) {
    warnings.push("LEGACY_FIELD_MAPPED: W_watchouts -> taskflow_cx.W.watchouts");
  }
  if (raw.F_flow && !raw.F) {
    warnings.push("LEGACY_FIELD_MAPPED: F_flow -> taskflow_cx.F.steps");
  }
  if (raw.L_language && !raw.L) {
    warnings.push("LEGACY_FIELD_MAPPED: L_language -> taskflow_cx.L.language");
  }
  if (raw.O_output_contract && !raw.O) {
    warnings.push("LEGACY_FIELD_MAPPED: O_output_contract -> taskflow_cx.O");
  }

  const watchouts =
    typeof raw.W === "string"
      ? toArray(raw.W)
      : raw.W?.watchouts ?? toArray(raw.W_watchouts, ["Never fabricate unsupported claims"]);

  let flowSteps: TaskflowCX20["F"]["steps"];
  if (typeof raw.F === "string") {
    const tokens = toArray(raw.F, ["intake", "draft", "review"]);
    flowSteps = tokens.map((stepName, idx) => ({
      id: `step_${idx + 1}`,
      kind:
        idx === 0
          ? "intake"
          : idx === tokens.length - 1
            ? "review"
            : "draft",
      requires_review: idx === tokens.length - 1 || stepName.includes("검토") || stepName.includes("review"),
    }));
  } else if (Array.isArray(raw.F)) {
    flowSteps = raw.F.map((stepName, idx) => ({
      id: `${idx + 1}_${stepName}`,
      kind:
        stepName === "intake" ||
        stepName === "retrieve" ||
        stepName === "draft" ||
        stepName === "verify" ||
        stepName === "review" ||
        stepName === "publish"
          ? stepName
          : idx === 0
            ? "intake"
            : idx === (raw.F as string[]).length - 1
              ? "review"
              : "draft",
      requires_review: stepName === "review" || idx === (raw.F as string[]).length - 1,
    }));
  } else if (raw.F?.steps) {
    flowSteps = raw.F.steps.map((s) => ({
      id: s.id,
      kind: s.kind,
      requires_review: Boolean(s.requires_review),
    }));
  } else {
    flowSteps = [
      { id: "intake", kind: "intake", requires_review: false },
      { id: "draft", kind: "draft", requires_review: false },
      { id: "verify", kind: "verify", requires_review: true },
    ];
  }

  const kBlock: TaskflowCX20["K"] =
    typeof raw.K === "string"
      ? {
          K_REF: toArray(raw.K, ["default_domain_reference"]),
          K_EX: ["default_domain_example"],
          K_IN: ["user_submitted_inputs"],
        }
      : {
          K_REF: raw.K?.K_REF ?? toArray(raw.K_REF, ["default_domain_reference"]),
          K_EX: raw.K?.K_EX ?? toArray(raw.K_EX, ["default_domain_example"]),
          K_IN: raw.K?.K_IN ?? toArray(raw.K_IN, ["user_submitted_inputs"]),
        };

  const oBlock: TaskflowCX20["O"] =
    typeof raw.O === "string"
      ? {
          artifact_type: "structured_report",
          required_sections: toArray(raw.O, ["summary", "details"]),
          citation_required: true,
        }
      : {
          artifact_type: raw.O?.artifact_type ?? "structured_report",
          required_sections:
            raw.O?.required_sections ?? toArray(raw.O_output_contract, ["summary", "details"]),
          citation_required: raw.O?.citation_required ?? true,
        };

  const taskflow_cx: TaskflowCX20 = {
    A: {
      actor,
      authority:
        typeof raw.A === "object" && raw.A?.authority
          ? raw.A.authority
          : ["draft_generation", "evidence_check"],
      escalation:
        typeof raw.A === "object" && raw.A?.escalation
          ? raw.A.escalation
          : ["missing_required_input", "fact_conflict"],
    },
    S: {
      trigger:
        typeof raw.S === "object" && raw.S?.trigger
          ? raw.S.trigger
          : "work_request_submitted",
      context:
        typeof raw.S === "string"
          ? raw.S
          : raw.S?.context ?? raw.S_situation ?? "Standard domain execution context",
      constraints:
        typeof raw.S === "object" && raw.S?.constraints
          ? raw.S.constraints
          : ["evidence_grounded", "schema_strict"],
    },
    T: {
      primary_task:
        typeof raw.T === "string"
          ? raw.T
          : raw.T?.primary_task ?? raw.T_task ?? "Generate structured deliverable",
      success_criteria:
        typeof raw.T === "object" && raw.T?.success_criteria
          ? raw.T.success_criteria
          : ["All required sections populated", "Zero fabricated citations"],
    },
    K: kBlock,
    W: {
      watchouts: watchouts.length > 0 ? watchouts : ["Avoid ungrounded assertions"],
      hard_stops:
        typeof raw.W === "object" && raw.W?.hard_stops
          ? raw.W.hard_stops
          : ["prohibited_impersonation", "conflicting_source_facts"],
    },
    F: {
      steps: flowSteps,
    },
    L: {
      language:
        typeof raw.L === "object" && raw.L?.language
          ? raw.L.language
          : raw.L_language ?? "ko-KR",
      tone:
        typeof raw.L === "string"
          ? raw.L
          : raw.L?.tone ?? "professional, analytical",
      style_rules:
        typeof raw.L === "object" && raw.L?.style_rules
          ? raw.L.style_rules
          : ["Use clear headings", "Distinguish facts from assumptions"],
    },
    O: oBlock,
  };

  return { taskflow_cx, warnings };
}

/**
 * Converts a v1 CasePackMAO or raw legacy JSON dictionary into a validated v2.0 `CasePackDefinition`.
 */
export function adaptLegacyCasePack(
  input: CasePackMAO | Record<string, unknown>,
  options?: { pack_id?: string; version?: string }
): LegacyAdapterResult {
  const raw = input as Record<string, unknown>;
  const rawTaskflow = (raw.taskflow_cx ?? raw.taskflow ?? raw) as LegacyTaskflowInput;
  const { taskflow_cx, warnings } = adaptLegacyTaskflow(rawTaskflow);

  const packId =
    options?.pack_id ??
    (typeof raw.pack_id === "string"
      ? raw.pack_id
      : typeof raw.id === "string"
        ? raw.id
        : typeof raw.key === "string"
          ? raw.key
          : "pack_adapted_default");

  const version =
    options?.version ?? (typeof raw.version === "string" ? raw.version : "2.0.0");

  const inputSchema =
    (raw.input_schema as Record<string, unknown>) ??
    (raw.input_contract as Record<string, unknown>) ?? {
      required: ["query"],
      properties: { query: { type: "string" } },
    };

  const outputSchema =
    (raw.output_schema as Record<string, unknown>) ??
    (raw.output_contract as Record<string, unknown>) ?? {
      required: taskflow_cx.O.required_sections,
    };

  const candidate: CasePackDefinition = {
    pack_id: packId,
    version,
    task: taskflow_cx.T.primary_task,
    input_schema: inputSchema,
    output_schema: outputSchema,
    steps: taskflow_cx.F.steps.map((s) => ({
      step_id: s.id,
      type: s.kind,
      requires_review: s.requires_review,
      actor: taskflow_cx.A.actor,
      watchouts: taskflow_cx.W.watchouts,
      hard_stops: taskflow_cx.W.hard_stops,
    })),
    evaluation_rules: [
      { rule_id: "schema_valid", type: "deterministic" },
      { rule_id: "no_invented_claim", type: "deterministic" },
      { rule_id: "citation_required", type: "deterministic", enabled: taskflow_cx.O.citation_required },
    ],
  };

  const validated = CasePackDefinitionSchema.parse(candidate);
  return { casepack: validated, taskflow_cx, warnings };
}

/**
 * Converts a Gallery v2.0 PilotPack (`gallery/pilot_packs/AG*.json`) into a canonical
 * `CasePackDefinition`, `TaskflowCX20`, and `PersonaProfile`.
 */
export function adaptPilotPackToCanonical(
  rawPilot: PilotPack | unknown,
  options?: { version?: string }
): {
  pilot: PilotPack;
  casepack: CasePackDefinition;
  taskflow_cx: TaskflowCX20;
  persona: PersonaProfile;
} {
  const pilot = PilotPackSchema.parse(rawPilot);
  const { taskflow_cx } = adaptLegacyTaskflow({
    A: pilot.taskflow.A,
    S: pilot.taskflow.S,
    T: pilot.taskflow.T,
    K: pilot.taskflow.K,
    W: pilot.taskflow.W,
    F: pilot.taskflow.F,
    L: pilot.taskflow.L,
    O: pilot.taskflow.O,
  });

  const requiredOut = Array.isArray((pilot.output_schema as Record<string, unknown>).required)
    ? ((pilot.output_schema as Record<string, unknown>).required as string[])
    : taskflow_cx.O.required_sections;
  taskflow_cx.O.required_sections = requiredOut;

  const casepack = CasePackDefinitionSchema.parse({
    pack_id: pilot.pack_id,
    version: options?.version ?? "2.0.0",
    task: pilot.taskflow.T,
    input_schema: pilot.input_schema,
    output_schema: pilot.output_schema,
    steps: taskflow_cx.F.steps.map((s) => ({
      step_id: s.id,
      type: s.kind,
      requires_review: s.requires_review,
      actor: taskflow_cx.A.actor,
      tools: pilot.required_capabilities,
    })),
    evaluation_rules: [
      { rule_id: "schema_valid", type: "deterministic" },
      { rule_id: "no_invented_claim", type: "deterministic" },
      ...pilot.benchmark_ids.map((bmId) => ({
        rule_id: `benchmark_${bmId}`,
        type: "benchmark",
        benchmark_id: bmId,
      })),
    ],
  });

  const persona = PersonaProfileSchema.parse({
    persona_id: `persona_${pilot.agent_id.toLowerCase()}`,
    role: pilot.taskflow.A,
    audience: pilot.taskflow.S,
    behavior_rules: [pilot.taskflow.L, ...taskflow_cx.W.watchouts],
    prohibited_claims: taskflow_cx.W.hard_stops,
    real_person_impersonation: false,
  });

  return { pilot, casepack, taskflow_cx, persona };
}
