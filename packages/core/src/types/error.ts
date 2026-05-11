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
