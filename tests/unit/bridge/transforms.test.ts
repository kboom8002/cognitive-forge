/**
 * tests/unit/bridge/transforms.test.ts
 *
 * Unit tests for the whitelisted transform functions.
 * All transforms must be pure, deterministic, and never use eval().
 */

import { describe, it, expect } from "vitest";
import { applyTransform } from "@cognitive-forge/bridge";

describe("applyTransform — copy / rename / passthrough", () => {
  it("copy returns value unchanged", () => {
    expect(applyTransform("hello", "copy")).toBe("hello");
  });
  it("rename is an alias for copy", () => {
    expect(applyTransform("hello", "rename")).toBe("hello");
  });
  it("empty string expr acts as copy", () => {
    expect(applyTransform(42, "")).toBe(42);
  });
  it("copy preserves non-string values", () => {
    const arr = [1, 2, 3];
    expect(applyTransform(arr, "copy")).toBe(arr);
  });
});

describe("applyTransform — trim", () => {
  it("trims surrounding whitespace", () => {
    expect(applyTransform("  hello  ", "trim")).toBe("hello");
  });
  it("returns non-string values unchanged", () => {
    expect(applyTransform(123, "trim")).toBe(123);
  });
  it("handles tabs and newlines", () => {
    expect(applyTransform("\t hello \n", "trim")).toBe("hello");
  });
});

describe("applyTransform — uppercase / lowercase", () => {
  it("uppercase converts to uppercase", () => {
    expect(applyTransform("hello world", "uppercase")).toBe("HELLO WORLD");
  });
  it("lowercase converts to lowercase", () => {
    expect(applyTransform("HELLO WORLD", "lowercase")).toBe("hello world");
  });
  it("uppercase returns non-string unchanged", () => {
    expect(applyTransform(99, "uppercase")).toBe(99);
  });
});

describe("applyTransform — normalize", () => {
  it("collapses multiple spaces", () => {
    expect(applyTransform("hello  world", "normalize")).toBe("hello world");
  });
  it("trims and collapses tabs and newlines", () => {
    expect(applyTransform("\t hello \n world \n", "normalize")).toBe("hello world");
  });
  it("returns non-string unchanged", () => {
    expect(applyTransform(null, "normalize")).toBeNull();
  });
});

describe("applyTransform — summarize", () => {
  it("returns short strings unchanged", () => {
    expect(applyTransform("short", "summarize")).toBe("short");
  });
  it("truncates strings longer than 280 chars with ellipsis", () => {
    const long = "a".repeat(300);
    const result = applyTransform(long, "summarize") as string;
    expect(result.endsWith("...")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(283); // 280 chars + "..."
  });
  it("normalises whitespace before truncating", () => {
    const spaced = "word ".repeat(100);
    const result = applyTransform(spaced, "summarize") as string;
    expect(result).not.toContain("  "); // no double spaces
    expect(result.endsWith("...")).toBe(true);
  });
  it("returns non-string unchanged", () => {
    expect(applyTransform(42, "summarize")).toBe(42);
  });
});

describe("applyTransform — infer", () => {
  it("returns the value when present", () => {
    expect(applyTransform("hello", "infer")).toBe("hello");
  });
  it("returns placeholder for undefined", () => {
    const result = applyTransform(undefined, "infer") as string;
    expect(result).toContain("[inferred");
  });
  it("returns placeholder for null", () => {
    const result = applyTransform(null, "infer") as string;
    expect(result).toContain("[inferred");
  });
  it("returns placeholder for empty string", () => {
    const result = applyTransform("", "infer") as string;
    expect(result).toContain("[inferred");
  });
});

describe("applyTransform — default:<fallback>", () => {
  it("returns value when truthy", () => {
    expect(applyTransform("existing", "default:N/A")).toBe("existing");
  });
  it("returns fallback when value is undefined", () => {
    expect(applyTransform(undefined, "default:N/A")).toBe("N/A");
  });
  it("returns fallback when value is null", () => {
    expect(applyTransform(null, "default:Unknown")).toBe("Unknown");
  });
  it("returns fallback when value is empty string", () => {
    expect(applyTransform("", "default:Missing")).toBe("Missing");
  });
});

describe("applyTransform — prefix:<str>", () => {
  it("prepends prefix to string value", () => {
    expect(applyTransform("world", "prefix:hello ")).toBe("hello world");
  });
  it("returns non-string unchanged", () => {
    expect(applyTransform(42, "prefix:num:")).toBe(42);
  });
});

describe("applyTransform — suffix:<str>", () => {
  it("appends suffix to string value", () => {
    expect(applyTransform("hello", "suffix: world")).toBe("hello world");
  });
  it("returns non-string unchanged", () => {
    expect(applyTransform(42, "suffix:!")).toBe(42);
  });
});

describe("applyTransform — template:<tpl>", () => {
  it("replaces {{VALUE}} with the value", () => {
    const result = applyTransform("World", "template:Hello, {{VALUE}}!");
    expect(result).toBe("Hello, World!");
  });
  it("replaces all occurrences of {{VALUE}}", () => {
    const result = applyTransform("X", "template:{{VALUE}}-{{VALUE}}");
    expect(result).toBe("X-X");
  });
  it("uses empty string when value is undefined", () => {
    const result = applyTransform(undefined, "template:Value: {{VALUE}}");
    expect(result).toBe("Value: ");
  });
});

describe("applyTransform — concat:<sep>", () => {
  it("joins array values with separator", () => {
    expect(applyTransform(["a", "b", "c"], "concat:, ")).toBe("a, b, c");
  });
  it("joins with custom separator", () => {
    expect(applyTransform([1, 2, 3], "concat: | ")).toBe("1 | 2 | 3");
  });
  it("returns non-array values unchanged", () => {
    expect(applyTransform("not an array", "concat:,")).toBe("not an array");
  });
});

describe("applyTransform — unknown expression", () => {
  it("falls back to copy for unknown transform names", () => {
    const value = "test";
    expect(applyTransform(value, "totally_unknown_transform")).toBe(value);
  });
});
