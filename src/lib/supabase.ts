/**
 * Supabase client factory
 *
 * Returns a lazily-initialised client. Safe to import at build time —
 * the error only fires when a query is actually made, not at module load.
 *
 * LOCAL:  set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
 * VERCEL: set them under Project → Settings → Environment Variables
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  // process.env is provided by Next.js at build time and runtime
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

  if (!url || !key) {
    throw new Error(
      "Supabase environment variables are not configured.\n" +
        "  • Local: copy .env.local.example to .env.local and fill in your values\n" +
        "  • Vercel: Project → Settings → Environment Variables"
    );
  }

  _client = createClient(url, key);
  return _client;
}
