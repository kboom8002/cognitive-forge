/**
 * RepairLoop — re-prompts the AI when output validation fails.
 *
 * The repair loop:
 * 1. Augments the original prompt with specific validation errors.
 * 2. Re-calls the AIProviderAdapter.
 * 3. Parses and re-validates the output.
 * 4. Repeats up to maxAttempts times.
 *
 * Returns a RepairResult indicating whether repair succeeded and how many
 * attempts were needed. If all attempts fail, the last output is returned
 * so the FallbackHandler can attempt partial salvage.
 *
 * ISOLATION: No React, Next.js, Supabase, or apps/web imports.
 */

import type { OutputContract, ValidationReport } from "@cognitive-forge/core";
import type { AIProviderAdapter, ProviderCallConfig } from "../ai/ai-provider";
import { validateOutput } from "../validators/output-validator";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RepairResult {
  /** Whether repair produced a valid output. */
  repaired: boolean;
  /** The best available output (repaired or last failed attempt). */
  output: Record<string, unknown>;
  /** Total number of repair attempts made. */
  attempts: number;
  /** Validation reports from each repair attempt. */
  reports: ValidationReport[];
  /** Accumulated token counts across all repair calls. */
  totalTokensIn: number;
  totalTokensOut: number;
}

// ── Repair prompt builder ─────────────────────────────────────────────────────

function buildRepairPrompt(
  originalPrompt: string,
  failedOutput: Record<string, unknown>,
  report: ValidationReport
): string {
  const errorLines = report.errors
    .filter((e) => e.blocking !== false)
    .map((e) => `- [${e.code}] ${e.message}${e.path ? ` (path: ${e.path.join(".")})` : ""}`)
    .join("\n");

  return (
    `${originalPrompt}\n\n` +
    `## REPAIR INSTRUCTION\n` +
    `Your previous output failed validation. Fix the following errors and respond with a complete, valid JSON object.\n\n` +
    `### Validation Errors\n${errorLines}\n\n` +
    `### Your Previous Output (for reference)\n` +
    `${JSON.stringify(failedOutput, null, 2)}\n\n` +
    `Respond with ONLY the corrected JSON object. Do not include any text outside of the JSON.`
  );
}

// ── RepairLoop ────────────────────────────────────────────────────────────────

/**
 * Attempts to repair invalid AI output by re-prompting with error context.
 *
 * @param adapter       - The AI provider adapter to call.
 * @param originalPrompt - The original assembled prompt.
 * @param callConfig    - Provider call configuration.
 * @param failedOutput  - The output that failed validation.
 * @param failedReport  - The validation report for the failed output.
 * @param contract      - OutputContract to validate against.
 * @param maxAttempts   - Maximum number of repair attempts.
 * @returns RepairResult indicating success/failure and the best output.
 */
export async function repairLoop(
  adapter: AIProviderAdapter,
  originalPrompt: string,
  callConfig: ProviderCallConfig,
  failedOutput: Record<string, unknown>,
  failedReport: ValidationReport,
  contract: OutputContract,
  maxAttempts: number
): Promise<RepairResult> {
  const reports: ValidationReport[] = [];
  let currentOutput = failedOutput;
  let currentReport = failedReport;
  let totalTokensIn = 0;
  let totalTokensOut = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const repairPrompt = buildRepairPrompt(originalPrompt, currentOutput, currentReport);

    try {
      const result = await adapter.call(repairPrompt, callConfig);
      totalTokensIn  += result.tokens_in;
      totalTokensOut += result.tokens_out;

      // Parse the repaired output
      let parsedOutput: Record<string, unknown>;
      try {
        parsedOutput = JSON.parse(result.raw_text) as Record<string, unknown>;
      } catch {
        // JSON parse failure — create a synthetic validation report
        const parseReport: ValidationReport = {
          valid: false,
          status: "fail",
          errors: [{
            code:     "JSON_PARSE_ERROR",
            message:  `Repair attempt ${attempt + 1} returned invalid JSON`,
            blocking: true,
          }],
          checked_at: new Date().toISOString(),
        };
        reports.push(parseReport);
        currentReport = parseReport;
        continue;
      }

      // Validate the repaired output
      const report = validateOutput(parsedOutput, contract);
      reports.push(report);

      if (report.valid) {
        return {
          repaired: true,
          output:   parsedOutput,
          attempts: attempt + 1,
          reports,
          totalTokensIn,
          totalTokensOut,
        };
      }

      // Repair failed — use this output for next attempt
      currentOutput = parsedOutput;
      currentReport = report;
    } catch {
      // Provider error during repair — record and continue
      const errorReport: ValidationReport = {
        valid: false,
        status: "fail",
        errors: [{
          code:     "REPAIR_PROVIDER_ERROR",
          message:  `Repair attempt ${attempt + 1} encountered a provider error`,
          blocking: true,
        }],
        checked_at: new Date().toISOString(),
      };
      reports.push(errorReport);
      currentReport = errorReport;
    }
  }

  // All repair attempts failed
  return {
    repaired: false,
    output:   currentOutput,
    attempts: maxAttempts,
    reports,
    totalTokensIn,
    totalTokensOut,
  };
}
