/**
 * Platform error codes and AppError class.
 *
 * AppError is the canonical error type thrown by all @cognitive-forge packages.
 * It carries a typed code so callers can handle specific failure modes.
 */

/** Typed error codes for all platform failure modes. */
export enum AppErrorCode {
  /** Schema or contract validation failed. */
  VALIDATION_ERROR = "VALIDATION_ERROR",
  /** Alias for OpenAPI / request validation failures (HTTP 400). */
  VALIDATION_FAILED = "VALIDATION_FAILED",
  /** A cross-reference rule was violated (e.g. unknown node referenced). */
  SCHEMA_VIOLATION = "SCHEMA_VIOLATION",
  /** A requested resource was not found. */
  NOT_FOUND = "NOT_FOUND",
  /** The caller is not authenticated. */
  UNAUTHORIZED = "UNAUTHORIZED",
  /** The caller is authenticated but lacks permission. */
  FORBIDDEN = "FORBIDDEN",
  /** An unexpected internal failure. */
  INTERNAL_ERROR = "INTERNAL_ERROR",
  /** The AI provider returned an error or unexpected response. */
  PROVIDER_ERROR = "PROVIDER_ERROR",
  /** An operation exceeded its time limit. */
  TIMEOUT = "TIMEOUT",
  /** An input or output contract was violated at runtime. */
  CONTRACT_VIOLATION = "CONTRACT_VIOLATION",
  /** A public response failed sanitization (forbidden keys present). */
  SANITIZATION_ERROR = "SANITIZATION_ERROR",
  /** Optimistic concurrency revision mismatch, idempotency conflict, or hash mismatch (HTTP 409). */
  CONFLICT = "CONFLICT",
  /** Precondition or release gate unmet (HTTP 422). */
  UNPROCESSABLE_ENTITY = "UNPROCESSABLE_ENTITY",
  /** Rate limit or quota exceeded (HTTP 429). */
  RATE_LIMITED = "RATE_LIMITED",
  /** Model output was not valid JSON (distinct from HTTP/timeout errors). */
  INVALID_MODEL_JSON = "INVALID_MODEL_JSON",
  /** AI provider HTTP error (4xx/5xx from upstream provider). */
  PROVIDER_HTTP_ERROR = "PROVIDER_HTTP_ERROR",
  /** Run exceeded token or cost budget cap. */
  BUDGET_EXCEEDED = "BUDGET_EXCEEDED",
}

/**
 * The canonical error class for all @cognitive-forge packages.
 *
 * Usage:
 *   throw new AppError(AppErrorCode.NOT_FOUND, "App not found", { slug });
 */
export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly details: unknown;

  constructor(code: AppErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;

    // Maintain correct prototype chain in transpiled ES5 environments.
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** Returns a plain JSON-safe representation for logging / API responses. */
  toJSON(): { name: string; code: AppErrorCode; message: string; details: unknown } {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}
