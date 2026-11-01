#!/usr/bin/env tsx
/**
 * scripts/smoke-api.ts
 *
 * Smoke check for API route handlers and management authentication guard:
 *   - GET /api/health returns 200 OK
 *   - requireManagementAuth rejects unauthenticated requests when enforced
 *   - requireManagementAuth accepts valid MANAGEMENT_API_KEY Bearer token
 *
 * Usage:
 *   pnpm smoke:api
 */

import { GET as getHealth } from "../apps/web/app/api/health/route";
import { requireManagementAuth } from "../apps/web/lib/api/auth";

async function main(): Promise<void> {
  console.log("\n🌐 Cognitive Forge — API Smoke Check\n");

  // 1. Health endpoint
  const healthRes = await getHealth();
  if (healthRes.status !== 200) {
    throw new Error(`/api/health returned status ${healthRes.status}`);
  }
  const healthJson = (await healthRes.json()) as { status?: string };
  if (healthJson.status !== "ok") {
    throw new Error(`/api/health returned unexpected body: ${JSON.stringify(healthJson)}`);
  }
  console.log("  ✅ GET /api/health returned 200 { status: 'ok' }");

  // 2. Management Auth guard — unauthenticated rejection
  const prevAdminKey = process.env.ADMIN_API_KEY;
  try {
    process.env.ADMIN_API_KEY = "smoke-test-secret-key";

    let rejected = false;
    try {
      const unauthReq = new Request("http://localhost/api/casepacks", { method: "GET" });
      await requireManagementAuth(unauthReq);
    } catch {
      rejected = true;
    }
    if (!rejected) {
      throw new Error("requireManagementAuth failed to reject unauthenticated request");
    }
    console.log("  ✅ requireManagementAuth rejected unauthenticated request");

    // 3. Management Auth guard — valid Bearer token accepted
    const authReq = new Request("http://localhost/api/casepacks", {
      method: "GET",
      headers: { Authorization: "Bearer smoke-test-secret-key" },
    });
    const authCtx = await requireManagementAuth(authReq);
    if (authCtx.type !== "admin") {
      throw new Error("requireManagementAuth did not return admin caller context");
    }
    console.log("  ✅ requireManagementAuth accepted valid Bearer token");
  } finally {
    if (prevAdminKey === undefined) {
      delete process.env.ADMIN_API_KEY;
    } else {
      process.env.ADMIN_API_KEY = prevAdminKey;
    }
  }

  console.log("\n✅ All API smoke checks passed.\n");
}

main().catch((err) => {
  console.error("\n💥 API smoke check failed:", err);
  process.exit(1);
});
