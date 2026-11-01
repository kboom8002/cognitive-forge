/**
 * state-machine.ts — State transition guards & optimistic concurrency revision checks (D06, D13).
 *
 * Enforces:
 *   1. Run status transitions:
 *      queued -> running | cancelled
 *      running -> waiting_input | waiting_review | completed | failed | cancelled
 *      waiting_input -> running | cancelled
 *      waiting_review -> running | completed | cancelled
 *   2. Optimistic concurrency: expected_revision === current_revision; increments revision by 1.
 *   3. Strict separation between Run status (completed), Evaluation status (pass), and Review status (approved).
 */

import { AppError, AppErrorCode } from "../types/error";
import type {
  V2RunStatus,
  ReviewStatus,
  ReviewDecisionAction,
} from "../schemas/v2-canonical";

const ALLOWED_RUN_TRANSITIONS: Record<V2RunStatus, readonly V2RunStatus[]> = {
  queued:         ["running", "cancelled", "failed"],
  running:        ["waiting_input", "waiting_review", "completed", "failed", "cancelled"],
  waiting_input:  ["running", "cancelled", "failed"],
  waiting_review: ["running", "completed", "cancelled", "failed"],
  completed:      [],
  failed:         ["queued", "running"],
  cancelled:      [],
};

export function assertExpectedRevision(currentRevision: number, expectedRevision: number): void {
  if (currentRevision !== expectedRevision) {
    throw new AppError(
      AppErrorCode.CONFLICT,
      `Revision conflict: expected revision ${expectedRevision}, but current revision is ${currentRevision}`,
      { current_revision: currentRevision, expected_revision: expectedRevision }
    );
  }
}

export function transitionRunState(params: {
  currentStatus:    V2RunStatus;
  nextStatus:       V2RunStatus;
  currentRevision:  number;
  expectedRevision?: number | undefined;
}): { status: V2RunStatus; revision: number } {
  const { currentStatus, nextStatus, currentRevision, expectedRevision } = params;

  if (expectedRevision !== undefined) {
    assertExpectedRevision(currentRevision, expectedRevision);
  }

  if (currentStatus === nextStatus) {
    return { status: currentStatus, revision: currentRevision };
  }

  const allowed = ALLOWED_RUN_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw new AppError(
      AppErrorCode.CONFLICT,
      `Illegal run state transition from "${currentStatus}" to "${nextStatus}"`,
      { from: currentStatus, to: nextStatus }
    );
  }

  return {
    status: nextStatus,
    revision: currentRevision + 1,
  };
}

export function resolveReviewDecisionTransition(
  decision: ReviewDecisionAction
): { reviewStatus: ReviewStatus; nextRunStatus: V2RunStatus } {
  switch (decision) {
    case "approve":
      return { reviewStatus: "approved", nextRunStatus: "completed" };
    case "request_changes":
      return { reviewStatus: "changes_requested", nextRunStatus: "waiting_review" };
    case "reject":
      return { reviewStatus: "changes_requested", nextRunStatus: "failed" };
  }
}
