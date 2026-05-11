/**
 * Factories: wires Supabase stores → repositories → services.
 * Import only in server-side route files.
 */

import {
  GraphRepository, GraphService,
  AppRepository, AppService,
} from "@cognitive-forge/casepack";
import { SupabaseGraphStore, SupabaseAppStore } from "../supabase/graph-app-store";
import { createServiceClient } from "../supabase/client";

export function createGraphService(): GraphService {
  const db    = createServiceClient();
  const store = new SupabaseGraphStore(db);
  const repo  = new GraphRepository(store);
  return new GraphService(repo);
}

export function createAppService(): AppService {
  const db    = createServiceClient();
  const store = new SupabaseAppStore(db);
  const repo  = new AppRepository(store);
  return new AppService(repo);
}
