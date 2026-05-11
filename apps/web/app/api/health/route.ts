import { NextResponse } from "next/server";

/**
 * GET /api/health
 *
 * Lightweight health-check endpoint used by:
 * - pnpm smoke:api (Sprint 11)
 * - Deployment readiness probes
 *
 * Intentionally does NOT hit the database (Supabase is Sprint 02).
 * Returns static JSON confirming the Next.js runtime is alive.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      status: "ok",
      service: "cognitive-forge-web",
      version: "0.0.1",
      ts: new Date().toISOString(),
    },
    { status: 200 }
  );
}
