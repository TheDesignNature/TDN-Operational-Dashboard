/**
 * Powershift reporting service
 *
 * Queries the `powershift_monthly_report` view in Supabase.
 * Uses getSupabaseClient() so the Supabase connection is only
 * established at runtime, not at build time.
 */

import { getSupabaseClient } from "@/lib/supabase";
import type { PowershiftMonthlyRow } from "@/types";

/**
 * Fetches all rows from powershift_monthly_report, ordered by month ascending.
 * Returns empty array if no data. Throws on network/auth errors.
 */
export async function getPowershiftMonthlyReport(): Promise<PowershiftMonthlyRow[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("powershift_monthly_report")
    .select("*")
    .order("month", { ascending: true });

  if (error) {
    throw new Error(`Failed to load Powershift report: ${error.message}`);
  }

  return (data as PowershiftMonthlyRow[]) ?? [];
}

/**
 * Returns the most recent month's row for summary cards.
 * Returns null if no data exists yet.
 */
export async function getLatestPowershiftMonth(): Promise<PowershiftMonthlyRow | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("powershift_monthly_report")
    .select("*")
    .order("month", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    // PGRST116 = no rows found — not an error condition
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to load latest Powershift data: ${error.message}`);
  }

  return data as PowershiftMonthlyRow;
}
