/**
 * Convenience factory: builds a fully-wired CasePackService for route handlers.
 * Uses the service-role client so it can read casepack_versions (FORBIDDEN cols).
 *
 * Import only in server-side route files (Next.js App Router `route.ts`).
 */

import { CasePackRepository, CasePackService } from "@cognitive-forge/casepack";
import { SupabaseCasePackStore } from "../supabase/casepack-store";
import { createServiceClient } from "../supabase/client";

export function createCasePackService(): CasePackService {
  const db    = createServiceClient();
  const store = new SupabaseCasePackStore(db);
  const repo  = new CasePackRepository(store);
  return new CasePackService(repo);
}
