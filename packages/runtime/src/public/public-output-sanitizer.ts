import type { OutputContract } from "@cognitive-forge/core";
import { sanitizePublicResponse } from "@cognitive-forge/validation";

/**
 * Sanitizes AI-produced output for public API consumption.
 *
 * @param output   - Raw output from the AI run (may contain extra keys).
 * @param contract - OutputContract from the resolved CasePack MAO.
 * @returns        A new object containing only safe, publicly-visible keys.
 */
export function sanitizePublicOutput(
  output: Record<string, unknown>,
  contract: OutputContract
): Record<string, unknown> {
  return sanitizePublicResponse(output, contract);
}
