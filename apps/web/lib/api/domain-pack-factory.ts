/**
 * Factory: wires SupabaseDomainPackStore → DomainPackRepository → DomainPackService.
 * Import only in server-side route files.
 */

import { DomainPackRepository, DomainPackService } from "@cognitive-forge/domain-packs";
import { SupabaseDomainPackStore } from "../supabase/domain-pack-store";
import { createServiceClient } from "../supabase/client";

export function createDomainPackService(): DomainPackService {
  const db    = createServiceClient();
  const store = new SupabaseDomainPackStore(db);
  const repo  = new DomainPackRepository(store);
  return new DomainPackService(repo);
}
