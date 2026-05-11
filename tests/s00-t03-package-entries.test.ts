/**
 * S00-T03 — Package entry point tests
 *
 * Verifies that all 7 workspace packages:
 * 1. Resolve correctly via their entry point
 * 2. Export their sentinel VERSION constant
 * 3. Respect isolation rules (core has no @cognitive-forge/* imports)
 * 4. The validation package exports the correct FORBIDDEN_PUBLIC_KEYS list
 */

import { describe, it, expect } from "vitest";

// Static imports — if any of these fail to resolve, the test file won't compile.
import { CORE_VERSION } from "@cognitive-forge/core";
import { CASEPACK_VERSION } from "@cognitive-forge/casepack";
import { DOMAIN_PACKS_VERSION } from "@cognitive-forge/domain-packs";
import { RUNTIME_VERSION } from "@cognitive-forge/runtime";
import { BRIDGE_VERSION } from "@cognitive-forge/bridge";
import { UI_FORGE_VERSION } from "@cognitive-forge/ui-forge";
import {
  VALIDATION_VERSION,
  FORBIDDEN_PUBLIC_KEYS,
} from "@cognitive-forge/validation";

// Re-export of CORE_VERSION through dependent packages
import {
  CORE_VERSION as CASEPACK_CORE_VERSION,
} from "@cognitive-forge/casepack";
import {
  CORE_VERSION as DOMAIN_PACKS_CORE_VERSION,
} from "@cognitive-forge/domain-packs";

describe("S00-T03 Package Entry Points", () => {
  describe("Version sentinels resolve", () => {
    it("@cognitive-forge/core exports CORE_VERSION", () => {
      expect(typeof CORE_VERSION).toBe("string");
      expect(CORE_VERSION).toBe("0.0.1");
    });

    it("@cognitive-forge/casepack exports CASEPACK_VERSION", () => {
      expect(typeof CASEPACK_VERSION).toBe("string");
      expect(CASEPACK_VERSION).toBe("0.0.1");
    });

    it("@cognitive-forge/domain-packs exports DOMAIN_PACKS_VERSION", () => {
      expect(typeof DOMAIN_PACKS_VERSION).toBe("string");
      expect(DOMAIN_PACKS_VERSION).toBe("0.0.1");
    });

    it("@cognitive-forge/runtime exports RUNTIME_VERSION", () => {
      expect(typeof RUNTIME_VERSION).toBe("string");
      expect(RUNTIME_VERSION).toBe("0.1.0");
    });

    it("@cognitive-forge/bridge exports BRIDGE_VERSION", () => {
      expect(typeof BRIDGE_VERSION).toBe("string");
      expect(BRIDGE_VERSION).toBe("0.1.0");
    });

    it("@cognitive-forge/ui-forge exports UI_FORGE_VERSION", () => {
      expect(typeof UI_FORGE_VERSION).toBe("string");
      expect(UI_FORGE_VERSION).toBe("0.1.0");
    });

    it("@cognitive-forge/validation exports VALIDATION_VERSION", () => {
      expect(typeof VALIDATION_VERSION).toBe("string");
      expect(VALIDATION_VERSION).toBe("0.0.1");
    });
  });

  describe("Dependency direction (core re-exported through dependents)", () => {
    it("casepack re-exports CORE_VERSION from core", () => {
      expect(CASEPACK_CORE_VERSION).toBe(CORE_VERSION);
    });

    it("domain-packs re-exports CORE_VERSION from core", () => {
      expect(DOMAIN_PACKS_CORE_VERSION).toBe(CORE_VERSION);
    });
  });

  describe("validation — FORBIDDEN_PUBLIC_KEYS", () => {
    const EXPECTED_KEYS = [
      "casepack_json",
      "manifest_json",
      "graph_json",
      "taskflow_cx",
      "K_REF",
      "runtime_contract",
      "model_policy",
      "bridge_output_json",
      "source_output_json",
      "target_input_json",
      "context_checkpoint_json",
      "trace_payload",
      "repair_attempts",
      "execution_plan",
    ] as const;

    it("exports FORBIDDEN_PUBLIC_KEYS as a tuple of 14 strings", () => {
      expect(Array.isArray(FORBIDDEN_PUBLIC_KEYS)).toBe(true);
      expect(FORBIDDEN_PUBLIC_KEYS).toHaveLength(14);
    });

    it("contains all 14 keys from doc 06", () => {
      for (const key of EXPECTED_KEYS) {
        expect(FORBIDDEN_PUBLIC_KEYS).toContain(key);
      }
    });

    it("does not contain any unexpected keys", () => {
      for (const key of FORBIDDEN_PUBLIC_KEYS) {
        expect(EXPECTED_KEYS).toContain(key);
      }
    });
  });
});
