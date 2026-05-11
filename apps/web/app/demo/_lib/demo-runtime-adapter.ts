/**
 * demo-runtime-adapter.ts
 *
 * Client-side adapter for calling public graph-run endpoints from demo pages.
 * Used exclusively by Live Runtime mode in SuiteDemoClient.
 *
 * Rules:
 * - Calls ONLY public endpoints (no auth required).
 * - Applies deepSanitize to every response before returning.
 * - Returns a safe fallback on any error.
 */

import { deepSanitize, FORBIDDEN_PUBLIC_KEYS } from "@cognitive-forge/validation";
import type { DemoSuite } from "./demo-registry";

export interface LiveRunResult {
  status: "success" | "error";
  output: Record<string, string>;
  error?: string;
}

/**
 * Calls POST /api/public/apps/{appSlug}/graph-run with the user's input
 * and returns a sanitized output record.
 */
export async function runLiveDemo(
  suite: DemoSuite,
  input: Record<string, string>,
): Promise<LiveRunResult> {
  const url = `/api/public/apps/${suite.appSlug}/graph-run`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    return {
      status: "error",
      output: {},
      error: `Live runtime unavailable (${res.status}): ${text}`,
    };
  }

  const json = await res.json();
  const rawOutput = json?.data?.final_output ?? json?.data?.output ?? {};

  // Defence-in-depth: strip forbidden keys from the response
  const sanitized = deepSanitize(rawOutput) as Record<string, unknown>;

  // Flatten to string values for output preview
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(sanitized)) {
    output[key] = typeof value === "string" ? value : JSON.stringify(value);
  }

  return { status: "success", output };
}
