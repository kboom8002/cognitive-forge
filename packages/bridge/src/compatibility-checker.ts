import type { InputContract, OutputContract, BridgeCasePack } from "@cognitive-forge/core";

export interface BridgeCompatibilityReport {
  status: "compatible" | "incompatible" | "warning";
  score: number;
  missing_mappings: string[];
  warnings: string[];
  recommended_bridge?: string | undefined;
  _internal_bridge_key?: string | undefined; // For builder mode / debugging
}

export function checkBridgeCompatibility(
  sourceOutput: OutputContract,
  targetInput: InputContract,
  bridge?: BridgeCasePack
): BridgeCompatibilityReport {
  // Support both array-based fields (real InputContract) and object-map fields (simplified bridge contracts)
  const targetFieldEntries: Array<{ key: string; required: boolean }> = Array.isArray(targetInput.fields)
    ? targetInput.fields.map(f => ({ key: f.key, required: (targetInput.required_fields ?? []).includes(f.key) }))
    : Object.entries(targetInput.fields).map(([key, def]: [string, any]) => ({ key, required: def.required !== false }));

  const totalFields = targetFieldEntries.length;
  
  if (totalFields === 0) {
    return {
      status: "compatible",
      score: 100,
      missing_mappings: [],
      warnings: [],
      ...(bridge?.key ? { _internal_bridge_key: bridge.key } : {})
    };
  }

  const missingMappings: string[] = [];
  const warnings: string[] = [];
  let fulfilledCount = 0;

  // Support both array-based fields and object-map fields for source output
  const sourceKeys: Set<string> = Array.isArray(sourceOutput.fields)
    ? new Set(sourceOutput.fields.map(f => f.key))
    : new Set(Object.keys(sourceOutput.fields));

  for (const { key, required: isRequired } of targetFieldEntries) {
    let isFulfilled = false;

    // Check if bridge maps it
    if (bridge && (bridge as any).mapped_data && key in (bridge as any).mapped_data) {
      isFulfilled = true;
    } else if (sourceKeys.has(key)) {
      isFulfilled = true;
    }

    if (isFulfilled) {
      fulfilledCount++;
    } else {
      if (isRequired) {
        missingMappings.push(key);
      } else {
        warnings.push(`Target optional field '${key}' is unmapped.`);
      }
    }
  }

  const score = Math.round((fulfilledCount / totalFields) * 100);
  
  let status: "compatible" | "incompatible" | "warning" = "compatible";
  if (missingMappings.length > 0) {
    status = "incompatible";
  } else if (warnings.length > 0) {
    status = "compatible"; // It's still compatible if only optional fields are missing, but we keep the warnings.
  }

  return {
    status,
    score,
    missing_mappings: missingMappings,
    warnings,
    ...(bridge?.key ? { _internal_bridge_key: bridge.key } : {})
  };
}

export function sanitizeCompatibilityReport(report: BridgeCompatibilityReport): Omit<BridgeCompatibilityReport, "_internal_bridge_key"> {
  const { _internal_bridge_key, ...safeReport } = report;
  return safeReport;
}
