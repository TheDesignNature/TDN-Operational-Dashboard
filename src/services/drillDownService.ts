import { getSupabaseClient } from "@/lib/supabase";

export interface SourceDataRow {
  client: string;
  client_id: string;
  month: string;
  month_date: string;
  data_source: string;
  channel: string | null;
  campaign_name: string | null;
  campaign_type: string | null;
  // Paid
  impressions: number | null;
  reach: number | null;
  clicks: number | null;
  spend: number | null;
  ctr_pct: number | null;
  cpc: number | null;
  conversions: number | null;
  cost_per_conv: number | null;
  post_engagements: number | null;
  // GA4
  traffic: number | null;
  vehicle_views: number | null;
  saved_vehicles: number | null;
  form_starts: number | null;
  form_submissions: number | null;
  hire_form_submissions: number | null;
  contact_form_submissions: number | null;
  website_calls: number | null;
  website_chat: number | null;
  email_link_clicks: number | null;
  messenger_leads: number | null;
  booking_completes: number | null;
  registrations: number | null;
  file_downloads: number | null;
  quote_starts: number | null;
  total_enquiries: number | null;
  cost_per_lead: number | null;
  wcr_pct: number | null;
  days_with_data: number | null;
  earliest: string | null;
  latest: string | null;
}

const CLIENT_UUIDS: Record<string, string> = {
  "powershift":           "b2d53ecf-f700-42e4-93e9-8cea66fcede6",
  "kkcs":                 "b04e39ae-ef5f-43dc-aeed-76959567f63a",
  "foundation-home":      "126e2bbc-95db-45da-a401-c986658f76e4",
  "study-hub":            "1c65ba78-c4bb-430d-94d0-729e16706bdf",
  "caloundra-city-auto":  "2144357d-8438-4d24-9fe7-c1d46cdf37b4",
  "caloundra-mazda":      "08bcfac7-1032-4279-9bc0-2566c9284fc5",
  "sell-a-car":           "af3cdca0-6866-427c-bfc5-0241d7fe9905",
};

export async function getSourceData(
  clientId: string,
  monthDate?: string
): Promise<SourceDataRow[]> {
  const uuid = CLIENT_UUIDS[clientId];
  if (!uuid) return [];

  const supabase = getSupabaseClient();

  let query = supabase
    .from("source_data_by_campaign")
    .select("*")
    .eq("client_id", uuid)
    .order("month_date", { ascending: false })
    .order("data_source")
    .order("campaign_name");

  if (monthDate) {
    query = query.eq("month_date", monthDate);
  } else {
    // Default: last 3 months
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 3);
    query = query.gte("month_date", cutoff.toISOString().split("T")[0]);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load source data: ${error.message}`);
  return (data ?? []) as SourceDataRow[];
}

export function getAvailableMonths(rows: SourceDataRow[]): string[] {
  const seen = new Set<string>();
  const months: string[] = [];
  for (const row of rows) {
    if (!seen.has(row.month_date)) {
      seen.add(row.month_date);
      months.push(row.month_date);
    }
  }
  return months.sort((a, b) => b.localeCompare(a));
}
