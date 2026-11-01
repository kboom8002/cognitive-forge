/**
 * Webhook Protocol — HMAC-SHA256 Signing, Replay Guard, Deduplication & Reconciliation
 *
 * Implements D08_ASYNC_EVENT_AND_WEBHOOK_SPEC.md, contracts/WEBHOOK_PROTOCOL.md,
 * T05_PUBLIC_API_AND_WEBHOOKS.md, and AT12:
 * - Signs payloads with `HMAC-SHA256(secret, "${timestamp}.${rawBody}")`
 * - Enforces 5-minute (300s) replay window on `X-Forge-Timestamp`
 * - Deduplicates incoming `EventEnvelope` events by `event_id`
 * - Provides `reconcileRunViaPolling` so consumers recover cleanly if a webhook drops
 */

import { createHmac, timingSafeEqual } from "crypto";
import {
  AppError,
  AppErrorCode,
  EventEnvelopeSchema,
  type EventEnvelope,
  type RunReceipt,
} from "@cognitive-forge/core";

export const WEBHOOK_REPLAY_WINDOW_SECONDS = 300;

export interface WebhookHeaders {
  "X-Forge-Timestamp": string;
  "X-Forge-Signature": string;
  "X-Forge-Event-Id": string;
  "X-Forge-Event-Type": string;
}

/**
 * Generates HMAC-SHA256 signature and canonical headers for an outgoing `EventEnvelope`.
 */
export function signWebhookPayload(
  envelope: EventEnvelope,
  secret: string,
  timestampSeconds: number = Math.floor(Date.now() / 1000)
): { rawBody: string; headers: WebhookHeaders } {
  const validated = EventEnvelopeSchema.parse(envelope);
  const rawBody = JSON.stringify(validated);
  const signingInput = `${timestampSeconds}.${rawBody}`;
  const digest = createHmac("sha256", secret).update(signingInput, "utf8").digest("hex");

  return {
    rawBody,
    headers: {
      "X-Forge-Timestamp": String(timestampSeconds),
      "X-Forge-Signature": `sha256=${digest}`,
      "X-Forge-Event-Id": validated.event_id,
      "X-Forge-Event-Type": validated.event_type,
    },
  };
}

/**
 * Verifies the `X-Forge-Timestamp` replay window and `X-Forge-Signature` HMAC digest.
 */
export function verifyWebhookSignature(params: {
  rawBody: string;
  timestampHeader: string;
  signatureHeader: string;
  secret: string;
  nowSeconds?: number;
  toleranceSeconds?: number;
}): boolean {
  const now = params.nowSeconds ?? Math.floor(Date.now() / 1000);
  const tolerance = params.toleranceSeconds ?? WEBHOOK_REPLAY_WINDOW_SECONDS;
  const ts = Number(params.timestampHeader);

  if (!Number.isFinite(ts) || Math.abs(now - ts) > tolerance) {
    throw new AppError(
      AppErrorCode.UNAUTHORIZED,
      "Webhook timestamp outside allowable 5-minute replay window",
      { timestamp: params.timestampHeader, now }
    );
  }

  if (!params.signatureHeader.startsWith("sha256=")) {
    throw new AppError(AppErrorCode.UNAUTHORIZED, "Malformed X-Forge-Signature header");
  }

  const expectedHex = createHmac("sha256", params.secret)
    .update(`${ts}.${params.rawBody}`, "utf8")
    .digest("hex");
  const actualHex = params.signatureHeader.slice("sha256=".length);

  const expectedBuf = Buffer.from(expectedHex, "utf8");
  const actualBuf = Buffer.from(actualHex, "utf8");

  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    throw new AppError(AppErrorCode.UNAUTHORIZED, "Invalid webhook HMAC signature");
  }

  return true;
}

/**
 * Consumer-side idempotent deduplicator (`AT12`) and run state reconciler.
 */
export class WebhookDeduplicator {
  private readonly processedEventIds = new Set<string>();
  private readonly eventLog: EventEnvelope[] = [];

  /**
   * Processes a verified webhook event exactly once by `event_id`.
   */
  processEvent(envelope: EventEnvelope): { accepted: boolean; duplicate: boolean } {
    const validated = EventEnvelopeSchema.parse(envelope);
    if (this.processedEventIds.has(validated.event_id)) {
      return { accepted: false, duplicate: true };
    }
    this.processedEventIds.add(validated.event_id);
    this.eventLog.push(validated);
    return { accepted: true, duplicate: false };
  }

  hasProcessed(eventId: string): boolean {
    return this.processedEventIds.has(eventId);
  }

  getProcessedEvents(): EventEnvelope[] {
    return [...this.eventLog];
  }

  /**
   * Reconciles run status via `GET /api/v1/runs/{run_id}` when a webhook delivery fails (`AT12`).
   */
  async reconcileRunState(
    runId: string,
    fetchRunReceipt: (runId: string) => Promise<RunReceipt> | RunReceipt
  ): Promise<RunReceipt> {
    return await fetchRunReceipt(runId);
  }
}
