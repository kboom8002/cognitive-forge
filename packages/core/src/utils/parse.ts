/**
 * safeParseOrThrow — type-safe schema validation helper.
 *
 * Validates `data` against `schema`. Returns the parsed, typed value on
 * success. Throws `AppError(VALIDATION_ERROR)` on failure with Zod issue
 * details attached so callers can inspect the specific violations.
 *
 * Usage:
 *   const app = safeParseOrThrow(AppObjectSchema, rawData);
 *   // app is fully typed as AppObject
 */

import { z } from "zod";
import { AppError, AppErrorCode } from "../types/error";

/**
 * Parse `data` with `schema` and return the typed result.
 * Throws `AppError` with code `VALIDATION_ERROR` if parsing fails.
 */
export function safeParseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError(
      AppErrorCode.VALIDATION_ERROR,
      `Schema validation failed: ${result.error.issues.map((i) => i.message).join("; ")}`,
      result.error.issues
    );
  }
  return result.data;
}

/**
 * Like safeParseOrThrow but returns a discriminated union result
 * instead of throwing. Useful when you want to handle errors inline.
 */
export function safeParse<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  return schema.safeParse(data);
}
