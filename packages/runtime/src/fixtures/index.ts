/**
 * Runtime fixtures — exported constants for testing and demo use.
 *
 * MOCK_OUTPUT_MAP: The standard mock AI output map used by MockAIProvider.
 * Loaded from mock-output-map.json at import time (bundled via Vite/tsc).
 *
 * The JSON file contains a "_note" metadata key which is a plain string.
 * We cast to unknown first to bypass the strict Record<string, Record<string, unknown>>
 * constraint that conflicts with the string-typed _note field.
 *
 * This file is the single authoritative import point for test/demo data.
 * Do NOT import mock data directly in runtime pipeline code.
 */

import rawMap from "./mock-output-map.json";

/** Mock AI output map. Key = casepack_key, Value = expected output object. */
export const MOCK_OUTPUT_MAP: Record<string, Record<string, unknown>> =
  (rawMap as unknown) as Record<string, Record<string, unknown>>;

export type { MockOutputMap } from "../ai/mock-ai-provider";
