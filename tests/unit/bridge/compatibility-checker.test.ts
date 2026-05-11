import { describe, it, expect } from "vitest";
import {
  checkBridgeCompatibility,
  sanitizeCompatibilityReport,
} from "../../../packages/bridge/src/compatibility-checker";
import type { InputContract, OutputContract, BridgeCasePack } from "@cognitive-forge/core";

describe("Bridge Compatibility Checker", () => {
  const mockSourceOutput: OutputContract = {
    fields: {
      company_profile: { type: "string", description: "Company summary" },
      brand_guidelines: { type: "string", description: "Brand voice" },
      optional_metrics: { type: "string", description: "Metrics" },
    },
    public_fields: ["company_profile"],
  };

  const mockTargetInput: InputContract = {
    fields: {
      company_context: { type: "string", description: "Context", required: true },
      brand_voice: { type: "string", description: "Voice", required: true },
      additional_notes: { type: "string", description: "Notes", required: false },
    },
  };

  const mockBridge: BridgeCasePack = {
    key: "bridge.mock.v1",
    version: "1.0.0",
    execution_type: "bridge_casepack",
    status: "production",
    mapped_data: {
      company_context: "{{source.company_profile}}",
      brand_voice: "{{source.brand_guidelines}}",
    },
  };

  it("T1: Compatible source/target contracts pass", () => {
    // Both required fields are mapped
    const report = checkBridgeCompatibility(mockSourceOutput, mockTargetInput, mockBridge);
    expect(report.status).toBe("compatible");
    expect(report.score).toBe(67);
    expect(report.missing_mappings).toHaveLength(0);
    // additional_notes is optional and unmapped, so it might be a warning, but won't fail compatibility
    expect(report.warnings).toContain("Target optional field 'additional_notes' is unmapped.");
  });

  it("T2: Missing required target fields fail", () => {
    const incompleteBridge: BridgeCasePack = {
      ...mockBridge,
      mapped_data: {
        company_context: "{{source.company_profile}}",
      }, // brand_voice missing
    };

    const report = checkBridgeCompatibility(mockSourceOutput, mockTargetInput, incompleteBridge);
    expect(report.status).toBe("incompatible");
    expect(report.score).toBe(33); // 1 out of 3 mapped
    expect(report.missing_mappings).toContain("brand_voice");
  });

  it("T3: Mapping rules coverage score", () => {
    // 2 required, 1 optional. If bridge maps all 3, score is 100.
    const fullBridge: BridgeCasePack = {
      ...mockBridge,
      mapped_data: {
        company_context: "{{source.company_profile}}",
        brand_voice: "{{source.brand_guidelines}}",
        additional_notes: "Hardcoded notes",
      },
    };
    const report = checkBridgeCompatibility(mockSourceOutput, mockTargetInput, fullBridge);
    expect(report.score).toBe(100);
    expect(report.status).toBe("compatible");
  });

  it("T4: default_values can satisfy optional gaps", () => {
    // Suppose additional_notes is required now
    const strictTargetInput: InputContract = {
      fields: {
        ...mockTargetInput.fields,
        additional_notes: { type: "string", description: "Notes", required: true },
      },
    };
    const hardcodedBridge: BridgeCasePack = {
      ...mockBridge,
      mapped_data: {
        company_context: "{{source.company_profile}}",
        brand_voice: "{{source.brand_guidelines}}",
        additional_notes: "Static default value", // Not a source reference, but a valid mapped value
      },
    };

    const report = checkBridgeCompatibility(mockSourceOutput, strictTargetInput, hardcodedBridge);
    expect(report.status).toBe("compatible");
    expect(report.missing_mappings).toHaveLength(0);
  });

  it("T5: Returns human-readable compatibility report", () => {
    const report = checkBridgeCompatibility(mockSourceOutput, mockTargetInput, mockBridge);
    expect(report).toHaveProperty("status");
    expect(report).toHaveProperty("score");
    expect(report).toHaveProperty("missing_mappings");
    expect(report).toHaveProperty("warnings");
    // recommended_bridge is optional — only present when the checker has a suggestion
  });

  it("T6: No raw internals leak in public mode", () => {
    const report = checkBridgeCompatibility(mockSourceOutput, mockTargetInput, mockBridge);
    
    // Assume we have an internal field in the original bridge or report.
    // The sanitized report should only contain the public fields.
    const sanitized = sanitizeCompatibilityReport(report);
    
    expect(sanitized).toHaveProperty("status");
    expect(sanitized).toHaveProperty("score");
    expect(sanitized).toHaveProperty("missing_mappings");
    expect(sanitized).toHaveProperty("warnings");
    
    // We shouldn't leak any internal execution types, versions, or system prompts.
    const raw = JSON.stringify(sanitized);
    expect(raw).not.toContain("execution_type");
    expect(raw).not.toContain("bridge.mock.v1");
  });
});
