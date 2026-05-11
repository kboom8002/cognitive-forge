/**
 * RetentionPolicy — determines whether trace/usage data is within retention.
 *
 * Sprint 06: Simple time-based retention. Actual DB-level cleanup deferred
 * to Sprint 11. Zero-retention mode returns false for all records — used
 * when a workspace opts out of trace storage.
 *
 * ISOLATION: No React, Next.js, Supabase, or apps/web imports.
 */

// ── Constants ─────────────────────────────────────────────────────────────────

/** Default retention period in days. */
export const RETENTION_DAYS = 90 as const;

/** Milliseconds per day. */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns true if the record with the given `createdAt` timestamp is
 * still within the retention window.
 *
 * @param createdAt       - ISO 8601 timestamp (e.g. from DB created_at column).
 * @param retentionDays   - Retention window in days. Default: RETENTION_DAYS (90).
 * @param now             - Current time for testing. Default: Date.now().
 */
export function isRetained(
  createdAt: string,
  retentionDays: number = RETENTION_DAYS,
  now: number = Date.now()
): boolean {
  const created = new Date(createdAt).getTime();
  if (isNaN(created)) return false;
  const cutoff = now - retentionDays * MS_PER_DAY;
  return created >= cutoff;
}

/**
 * Returns true if zero-retention mode is active.
 * In zero-retention mode, trace and usage data should NOT be persisted.
 *
 * @param zeroRetention - Whether zero-retention is enabled for this workspace.
 */
export function shouldPersist(zeroRetention: boolean): boolean {
  return !zeroRetention;
}
