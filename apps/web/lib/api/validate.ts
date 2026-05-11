/**
 * Zod-based request body parser.
 * Throws HttpError(400) on invalid JSON or schema violations.
 */

import type { ZodSchema } from "zod";
import { HttpError } from "./response";

export async function validateBody<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "INVALID_JSON", "Request body must be valid JSON");
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Request body validation failed",
      result.error.issues
    );
  }
  return result.data;
}

/** Extract and validate a required query parameter. */
export function requireQuery(
  url: URL,
  param: string
): string {
  const value = url.searchParams.get(param);
  if (!value) {
    throw new HttpError(400, "MISSING_PARAM", `Required query parameter "${param}" is missing`);
  }
  return value;
}
