/**
 * S00-T02 — Health route smoke test
 *
 * Tests the GET /api/health route handler directly (no HTTP server required).
 * Next.js route handlers are plain async functions that return Response objects.
 */

import { describe, it, expect } from "vitest";

// We import the route handler directly — no server needed.
// This works because Next.js route handlers are plain functions.
describe("GET /api/health", () => {
  it("returns 200 status", async () => {
    const { GET } = await import("../apps/web/app/api/health/route");
    const response = await GET();
    expect(response.status).toBe(200);
  });

  it("returns correct JSON shape", async () => {
    const { GET } = await import("../apps/web/app/api/health/route");
    const response = await GET();
    const body = (await response.json()) as Record<string, unknown>;

    expect(body.status).toBe("ok");
    expect(body.service).toBe("cognitive-forge-web");
    expect(typeof body.version).toBe("string");
    expect(typeof body.ts).toBe("string");
    // ts must be a valid ISO 8601 date string
    expect(new Date(body.ts as string).toISOString()).toBe(body.ts);
  });
});
