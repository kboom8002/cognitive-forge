/**
 * Supabase server-side client factory.
 * Server-only — never import this in client components.
 */

import { createClient } from "@supabase/supabase-js";

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

/** User-scoped client — RLS applied based on user session. */
export function createUserClient(accessToken: string) {
  return createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    }
  );
}

/** Service-role client — bypasses RLS. Use only for server-side operations. */
export function createServiceClient() {
  return createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } }
  );
}
