/**
 * Powershift reporting service
 *
 * This is the only service that connects to real Supabase data.
 * It queries the `powershift_monthly_report` view.
 *
 * The view must exist in your Supabase project before this runs.
 * If the view doesn't exist yet, the function returns an empty array
 * rather than crashing — the UI shows an appropriate empty state.
 */

import { supabase } from "@/lib/supabase";
import type { PowershiftMonthlyRow } from "@/types";

/**
 * Fetches all rows from powershift_monthly_report, ordered by month ascending.
 *
 * Returns an empty array if the view doesn't exist yet or returns no data.
 * Throws on genuine network / auth errors so the caller can show an error state.
 */
export async function getPowershiftMonthlyReport(): Promise<PowershiftMonthlyRow[]> {
  const { data, error } = await supabase
    .from("powershift_monthly_report")
    .select("*")
    .order("month", { ascending: true });

  if (error) {
    // Surface the error to the caller — don't swallow it silently
    throw new Error(`Failed to load Powershift report: ${error.message}`);
  }

  return (data as PowershiftMonthlyRow[]) ?? [];
}

/**
 * Returns the most recent month's row for use in summary cards.
 * Returns null if there's no data yet.
 */
export async function getLatestPowershiftMonth(): Promise<PowershiftMonthlyRow | null> {
  const { data, error } = await supabase
    .from("powershift_monthly_report")
    .select("*")
    .order("month", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // No rows — not an error
    throw new Error(`Failed to load latest Powershift data: ${error.message}`);
  }

  return data as PowershiftMonthlyRow;
}
