import { describe, it, expect } from "vitest";
import {
  validateInput,
  validateOutput,
  sanitizePublicResponse,
  FORBIDDEN_PUBLIC_KEYS,
} from "@cognitive-forge/validation";

describe("Validation Package Exports", () => {
  describe("validateInput", () => {
    const contract = {
      fields: [
        { key: "username", type: "string" as const, label: "User" },
        { key: "role", type: "select" as const, label: "Role", options: ["admin", "user"] },
      ],
      required_fields: ["username", "role"],
    };

    it("passes with valid input", () => {
      const result = validateInput({ username: "alice", role: "admin" }, contract);
      expect(result.valid).toBe(true);
      expect(result.status).toBe("pass");
    });

    it("fails missing required field", () => {
      const result = validateInput({ role: "admin" }, contract);
      expect(result.valid).toBe(false);
      expect(result.status).toBe("fail");
      expect(result.errors.some((e) => e.code === "MISSING_REQUIRED_FIELD")).toBe(true);
    });

    it("fails type mismatch (select not in options)", () => {
      const result = validateInput({ username: "alice", role: "guest" }, contract);
      expect(result.valid).toBe(false);
      expect(result.status).toBe("fail");
      expect(result.errors.some((e) => e.code === "FIELD_VALUE_NOT_IN_OPTIONS")).toBe(true);
    });
  });

  describe("validateOutput", () => {
    const contract = {
      fields: [
        { key: "summary", type: "string" as const, label: "Summary" },
        { key: "score", type: "number" as const, label: "Score" },
      ],
      required_fields: ["summary"],
      public_fields: ["summary"],
    };

    it("passes with valid AI output", () => {
      const result = validateOutput({ summary: "Good job", score: 95 }, contract);
      expect(result.valid).toBe(true);
      expect(result.status).toBe("pass");
    });

    it("fails missing required output field", () => {
      const result = validateOutput({ score: 95 }, contract);
      expect(result.valid).toBe(false);
      expect(result.status).toBe("fail");
      expect(result.errors.some((e) => e.code === "MISSING_REQUIRED_OUTPUT_FIELD")).toBe(true);
    });
  });

  describe("sanitizePublicResponse", () => {
    const contract = {
      fields: [
        { key: "summary", type: "string" as const, label: "Summary" },
        { key: "internal_notes", type: "string" as const, label: "Notes" },
      ],
      required_fields: ["summary"],
      public_fields: ["summary"],
    };

    it("strips forbidden keys", () => {
      // Pick the first forbidden key for test
      const forbiddenKey = FORBIDDEN_PUBLIC_KEYS[0];
      const output = {
        summary: "Public text",
        [forbiddenKey]: "SECRET",
      };
      
      const result = sanitizePublicResponse(output, contract);
      expect(result).toHaveProperty("summary");
      expect(result).not.toHaveProperty(forbiddenKey);
    });

    it("strips non-public fields", () => {
      const output = {
        summary: "Public text",
        internal_notes: "Hidden notes",
      };
      
      const result = sanitizePublicResponse(output, contract);
      expect(result).toHaveProperty("summary");
      expect(result).not.toHaveProperty("internal_notes");
    });

    it("returns only public_fields", () => {
      const output = {
        summary: "Public text",
        extra_key: "Extra",
      };
      
      const result = sanitizePublicResponse(output, contract);
      expect(Object.keys(result)).toEqual(["summary"]);
    });
  });
});
