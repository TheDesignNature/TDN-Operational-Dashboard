import { CLIENT_UUIDS } from "@/lib/clientIds";

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

/**
 * Fetches campaign-level drill-down data via the server-side API route
 * (which queries fact_paid_campaign_daily / fact_website_channel_daily /
 * fact_events_daily). Previously queried a nonexistent `source_data_by_campaign`
 * view directly from the browser using a server-only Supabase key.
 */
export async function getSourceData(
  clientId: string,
  monthDate?: string
): Promise<SourceDataRow[]> {
  if (!CLIENT_UUIDS[clientId]) return [];

  const url = monthDate
    ? `/api/clients/${clientId}/drilldown?month=${monthDate}`
    : `/api/clients/${clientId}/drilldown`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to load source data (${res.status})`);
  }
  const body = await res.json();
  return (body.rows ?? []) as SourceDataRow[];
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
