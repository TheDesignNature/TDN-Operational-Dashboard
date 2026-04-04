/**
 * Powershift reporting service
 *
 * Queries the `powershift_monthly_report` view in Supabase.
 * Column names match the actual view schema.
 */

import { getSupabaseClient } from "@/lib/supabase";
import type { PowershiftMonthlyRow } from "@/types";

/**
 * Fetches all rows from powershift_monthly_report, ordered by date ascending.
 */
export async function getPowershiftMonthlyReport(): Promise<PowershiftMonthlyRow[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("powershift_monthly_report")
    .select("*")
    .order("metric_date", { ascending: true }); // cache bust

  if (error) {
    throw new Error(`Failed to load Powershift report: ${error.message}`);
  }

  return (data as PowershiftMonthlyRow[]) ?? [];
}

/**
 * Returns the most recent month's row for summary cards.
 */
export async function getLatestPowershiftMonth(): Promise<PowershiftMonthlyRow | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("powershift_monthly_report")
    .select("*")
    .order("metric_date", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to load latest Powershift data: ${error.message}`);
  }

  return data as PowershiftMonthlyRow;
}
export interface PowershiftMTD {
  month_label: string;
  spend_mtd: number;
  traffic_mtd: number;
  impressions_mtd: number;
  clicks_mtd: number;
  conversions_mtd: number;
  enquiries_mtd: number;
  cpc_mtd: number;
  ctr_mtd: number | null;
  cost_per_enquiry_mtd: number | null;
  conversion_rate_mtd: number;
  days_tracked: number;
  last_updated: string;
}

export async function getPowershiftMTD(): Promise<PowershiftMTD | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("powershift_mtd")
    .select("*")
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to load Powershift MTD: ${error.message}`);
  }

  return data as PowershiftMTD;
}
