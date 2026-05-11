import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReleaseChecker } from "../../../scripts/release-check";
import childProcess from "child_process";
import fs from "fs";

vi.mock("child_process", () => ({
  default: {
    execSync: vi.fn(),
  }
}));

vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(),
  }
}));

describe("ReleaseChecker", () => {
  let checker: ReleaseChecker;

  beforeEach(() => {
    vi.resetAllMocks();
    checker = new ReleaseChecker();
    
    // Mock successful execution by default
    (childProcess.execSync as any).mockReturnValue(Buffer.from("success"));
    (fs.existsSync as any).mockReturnValue(true);
  });

  it("T4: Commercial gates are included", () => {
    const gates = checker.getGates();
    const gateNames = gates.map(g => g.name);
    
    expect(gateNames).toContain("typecheck passes");
    expect(gateNames).toContain("unit tests pass");
    expect(gateNames).toContain("integration tests pass");
    expect(gateNames).toContain("fixtures validate");
    expect(gateNames).toContain("smoke runtime passes");
    expect(gateNames).toContain("smoke security passes");
    expect(gateNames).toContain("E2E tests pass");
    expect(gateNames).toContain("build passes");
    expect(gateNames).toContain("/demo renders");
    expect(gateNames).toContain("/demo/apps renders");
    expect(gateNames).toContain("three Suite app routes exist");
    expect(gateNames).toContain("public no-leak scan passes");
  });

  it("T1: Reports failed gates when a command throws", () => {
    // Mock typecheck failure
    (childProcess.execSync as any).mockImplementation((cmd: string) => {
      if (cmd.includes("tsc")) {
        throw new Error("Type error");
      }
      return Buffer.from("success");
    });

    const results = checker.runAll();
    const typecheckResult = results.find(r => r.name === "typecheck passes");
    
    expect(typecheckResult?.status).toBe("fail");
    expect(typecheckResult?.error).toContain("Type error");
  });

  it("T2: Exits non-zero on blocker (hasFailedBlocker returns true)", () => {
    (childProcess.execSync as any).mockImplementation(() => {
      throw new Error("Failure");
    });

    const results = checker.runAll();
    expect(checker.hasFailedBlocker(results)).toBe(true);
  });

  it("T3: Prints readable summary", () => {
    const results = [
      { name: "typecheck passes", status: "pass" as const },
      { name: "build passes", status: "fail" as const, error: "Compilation failed" }
    ];
    
    const summary = checker.generateSummary(results);
    expect(summary).toContain("✅ typecheck passes");
    expect(summary).toContain("❌ build passes");
    expect(summary).toContain("Compilation failed");
  });

  it("calculates commercial readiness score", () => {
    const results = [
      { name: "typecheck passes", status: "pass" as const },
      { name: "build passes", status: "pass" as const },
      { name: "/demo renders", status: "pass" as const },
      { name: "E2E tests pass", status: "fail" as const }
    ];
    
    const score = checker.calculateScore(results);
    // 3 out of 4 passed = 75%
    expect(score).toBe(75);
  });
});
