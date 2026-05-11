/**
 * API response helpers — enforces doc 07 response envelope.
 *
 * Success: { data: T, meta?: Record<string, unknown> }
 * Error:   { error: { code, message, details? } }
 */

import { NextResponse } from "next/server";
import { AppError } from "@cognitive-forge/core";

// ── Response builders ─────────────────────────────────────────────────────────

export function apiSuccess<T>(
  data: T,
  meta?: Record<string, unknown>,
  status = 200
): NextResponse {
  return NextResponse.json(
    { data, ...(meta ? { meta } : {}) },
    { status }
  );
}

export function apiError(
  code: string,
  message: string,
  status: number,
  details?: unknown
): NextResponse {
  return NextResponse.json(
    { error: { code, message, ...(details !== undefined ? { details } : {}) } },
    { status }
  );
}

// ── HttpError ─────────────────────────────────────────────────────────────────

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "HttpError";
  }
}

// ── Central error handler ─────────────────────────────────────────────────────

export function handleRouteError(err: unknown): NextResponse {
  if (err instanceof HttpError) {
    return apiError(err.code, err.message, err.status, err.details);
  }
  if (err instanceof AppError) {
    const status =
      err.code === "NOT_FOUND"        ? 404 :
      err.code === "VALIDATION_ERROR" ? 400 :
      err.code === "UNAUTHORIZED"     ? 401 :
      err.code === "FORBIDDEN"        ? 403 : 500;
    return apiError(err.code, err.message, status);
  }
  console.error("[API ERROR]", err);
  return apiError("INTERNAL_ERROR", "An unexpected error occurred.", 500);
}
