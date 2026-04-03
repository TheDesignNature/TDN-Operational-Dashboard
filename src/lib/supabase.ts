/**
 * Supabase client
 *
 * Used by server components and service functions.
 * Both env vars must be present — the app will throw clearly if they aren't.
 *
 * LOCAL: add to .env.local
 * VERCEL: add under Project → Settings → Environment Variables
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables.\n" +
      "Copy .env.local.example to .env.local and fill in your project URL and anon key."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
