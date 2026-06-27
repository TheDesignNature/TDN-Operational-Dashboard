import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { getClientUuid } from "@/lib/clientIds";

export const runtime = "nodejs";

/**
 * Month-to-date snapshot, computed live from the fact_* views since no
 * pre-aggregated MTD view exists in Supabase. Paid metrics come from
 * fact_paid_campaign_daily; traffic/enquiries come from fact_website_channel_daily
 * and fact_events_daily (is_enquiry = true).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;
  const uuid = getClientUuid(clientId);
  if (!uuid) {
    return NextResponse.json({ mtd: null });
  }

  const supabase = getSupabaseClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const todayStr = now.toISOString().split("T")[0];

  const [paidRes, websiteRes, eventsRes] = await Promise.all([
    supabase
      .from("fact_paid_campaign_daily")
      .select("date, cost, impressions, clicks, conversions")
      .eq("client_id", uuid)
      .gte("date", monthStart)
      .lte("date", todayStr),
    supabase
      .from("fact_website_channel_daily")
      .select("date, sessions")
      .eq("client_id", uuid)
      .gte("date", monthStart)
      .lte("date", todayStr),
    supabase
      .from("fact_events_daily")
      .select("date, event_count")
      .eq("client_id", uuid)
      .eq("is_enquiry", true)
      .gte("date", monthStart)
      .lte("date", todayStr),
  ]);

  if (paidRes.error) return NextResponse.json({ error: paidRes.error.message }, { status: 500 });
  if (websiteRes.error) return NextResponse.json({ error: websiteRes.error.message }, { status: 500 });
  if (eventsRes.error) return NextResponse.json({ error: eventsRes.error.message }, { status: 500 });

  const paidRows = paidRes.data ?? [];
  const websiteRows = websiteRes.data ?? [];
  const eventRows = eventsRes.data ?? [];

  const spend = paidRows.reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
  const impressions = paidRows.reduce((sum, r) => sum + (Number(r.impressions) || 0), 0);
  const clicks = paidRows.reduce((sum, r) => sum + (Number(r.clicks) || 0), 0);
  const conversions = paidRows.reduce((sum, r) => sum + (Number(r.conversions) || 0), 0);
  const traffic = websiteRows.reduce((sum, r) => sum + (Number(r.sessions) || 0), 0);
  const enquiries = eventRows.reduce((sum, r) => sum + (Number(r.event_count) || 0), 0);

  const datesWithData = new Set([
    ...paidRows.map((r) => r.date),
    ...websiteRows.map((r) => r.date),
  ]);

  if (datesWithData.size === 0) {
    return NextResponse.json({ mtd: null });
  }

  const mtd = {
    month_label: now.toLocaleDateString("en-AU", { month: "long", year: "numeric" }),
    spend_mtd: spend,
    traffic_mtd: traffic,
    impressions_mtd: impressions,
    clicks_mtd: clicks,
    conversions_mtd: conversions,
    enquiries_mtd: enquiries,
    cpc_mtd: clicks > 0 ? spend / clicks : 0,
    ctr_mtd: impressions > 0 ? (clicks / impressions) * 100 : null,
    cost_per_enquiry_mtd: enquiries > 0 ? spend / enquiries : null,
    conversion_rate_mtd: traffic > 0 ? (enquiries / traffic) * 100 : 0,
    days_tracked: datesWithData.size,
    last_updated: todayStr,
  };

  return NextResponse.json({ mtd });
}
