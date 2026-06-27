/**
 * Powershift month-to-date service.
 *
 * Previously queried nonexistent `powershift_monthly_report` / `powershift_mtd`
 * Supabase views directly from the browser using the service-role key (which
 * can't work client-side regardless of view names). Now fetches from the
 * server-side /api/clients/[id]/mtd route, which computes MTD live from
 * fact_paid_campaign_daily / fact_website_channel_daily / fact_events_daily.
 */

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
  const res = await fetch(`/api/clients/powershift/mtd`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to load Powershift MTD (${res.status})`);
  }
  const body = await res.json();
  return (body.mtd ?? null) as PowershiftMTD | null;
}
