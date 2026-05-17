/**
 * Supabase client factory
 *
 * Uses the SERVICE ROLE key on the server so API routes
 * can bypass RLS for sync/import operations.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];

  // IMPORTANT: use service role key server-side
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!url || !key) {
    throw new Error(
      "Supabase environment variables are not configured.\n" +
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  _client = createClient(url, key);

  return _client;
}
