import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { getClientUuid } from "@/lib/clientIds";

export const runtime = "nodejs";

/**
 * Campaign-level drill-down, built from fact_paid_campaign_daily (real
 * per-campaign rows) for the "paid" tab, and an aggregated GA4 row per
 * month for the "website" tab (fact_website_channel_daily / fact_events_daily
 * don't carry a campaign dimension comparable to paid campaigns, so we
 * report one "All campaigns" row per month for that source, same as the
 * UI already renders for null campaign_name).
 *
 * Event -> column mapping is driven by event_lookup.report_label:
 *   Form Submission -> form_submissions
 *   Phone Click     -> website_calls
 *   Email Click     -> email_link_clicks
 *   Booking         -> booking_completes
 *   Registration    -> registrations
 *   (anything with is_enquiry = true counts toward total_enquiries)
 */

const REPORT_LABEL_COLUMN: Record<string, string> = {
  "Form Submission": "form_submissions",
  "Phone Click": "website_calls",
  "Email Click": "email_link_clicks",
  "Booking": "booking_completes",
  "Registration": "registrations",
};

function monthOf(dateStr: string): string {
  return dateStr.slice(0, 7) + "-01";
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params;
  const monthParam = req.nextUrl.searchParams.get("month");
  const uuid = getClientUuid(clientId);
  if (!uuid) {
    return NextResponse.json({ rows: [] });
  }

  const supabase = getSupabaseClient();

  let fromDate: string;
  let toDate: string | null = null;
  if (monthParam) {
    fromDate = monthParam;
    const next = new Date(monthParam + "T00:00:00");
    next.setMonth(next.getMonth() + 1);
    toDate = next.toISOString().split("T")[0];
  } else {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 3);
    fromDate = cutoff.toISOString().split("T")[0];
  }

  const applyRange = (q: any) => (toDate ? q.gte("date", fromDate).lt("date", toDate) : q.gte("date", fromDate));

  const [paidRes, websiteRes, eventsRes] = await Promise.all([
    applyRange(
      supabase
        .from("fact_paid_campaign_daily")
        .select("date, platform, campaign_name, impressions, clicks, cost, conversions")
        .eq("client_id", uuid)
    ),
    applyRange(
      supabase
        .from("fact_website_channel_daily")
        .select("date, sessions")
        .eq("client_id", uuid)
    ),
    applyRange(
      supabase
        .from("fact_events_daily")
        .select("date, report_label, is_enquiry, event_count")
        .eq("client_id", uuid)
    ),
  ]);

  if (paidRes.error) return NextResponse.json({ error: paidRes.error.message }, { status: 500 });
  if (websiteRes.error) return NextResponse.json({ error: websiteRes.error.message }, { status: 500 });
  if (eventsRes.error) return NextResponse.json({ error: eventsRes.error.message }, { status: 500 });

  // ── Paid: group by month + platform + campaign_name ──
  type PaidAgg = { impressions: number; clicks: number; spend: number; conversions: number };
  const paidGroups = new Map<string, PaidAgg & { month: string; platform: string; campaign_name: string }>();

  for (const r of paidRes.data ?? []) {
    const month = monthOf(String(r.date));
    const key = `${month}|${r.platform}|${r.campaign_name ?? ""}`;
    if (!paidGroups.has(key)) {
      paidGroups.set(key, { month, platform: r.platform, campaign_name: r.campaign_name ?? "", impressions: 0, clicks: 0, spend: 0, conversions: 0 });
    }
    const g = paidGroups.get(key)!;
    g.impressions += Number(r.impressions) || 0;
    g.clicks += Number(r.clicks) || 0;
    g.spend += Number(r.cost) || 0;
    g.conversions += Number(r.conversions) || 0;
  }

  // ── Website: aggregate sessions by month ──
  const sessionsByMonth = new Map<string, number>();
  for (const r of websiteRes.data ?? []) {
    const month = monthOf(String(r.date));
    sessionsByMonth.set(month, (sessionsByMonth.get(month) ?? 0) + (Number(r.sessions) || 0));
  }

  // ── Events: aggregate by month + mapped column, plus total enquiries ──
  const eventsByMonth = new Map<string, Record<string, number> & { total_enquiries: number }>();
  for (const r of eventsRes.data ?? []) {
    const month = monthOf(String(r.date));
    if (!eventsByMonth.has(month)) eventsByMonth.set(month, { total_enquiries: 0 });
    const bucket = eventsByMonth.get(month)!;
    const count = Number(r.event_count) || 0;
    const col = REPORT_LABEL_COLUMN[r.report_label as string];
    if (col) bucket[col] = (bucket[col] ?? 0) + count;
    if (r.is_enquiry) bucket.total_enquiries += count;
  }

  const spendByMonth = new Map<string, number>();
  for (const g of Array.from(paidGroups.values())) {
    spendByMonth.set(g.month, (spendByMonth.get(g.month) ?? 0) + g.spend);
  }

  const rows: any[] = [];

  for (const g of Array.from(paidGroups.values())) {
    const ctr = g.impressions > 0 ? (g.clicks / g.impressions) * 100 : null;
    const cpc = g.clicks > 0 ? g.spend / g.clicks : null;
    const costPerConv = g.conversions > 0 ? g.spend / g.conversions : null;
    rows.push({
      client: clientId,
      client_id: uuid,
      month: g.month,
      month_date: g.month,
      data_source: g.platform,
      channel: null,
      campaign_name: g.campaign_name || null,
      campaign_type: null,
      impressions: g.impressions,
      reach: null,
      clicks: g.clicks,
      spend: Math.round(g.spend * 100) / 100,
      ctr_pct: ctr,
      cpc,
      conversions: g.conversions,
      cost_per_conv: costPerConv,
      post_engagements: null,
      traffic: null,
      vehicle_views: null,
      saved_vehicles: null,
      form_starts: null,
      form_submissions: null,
      hire_form_submissions: null,
      contact_form_submissions: null,
      website_calls: null,
      website_chat: null,
      email_link_clicks: null,
      messenger_leads: null,
      booking_completes: null,
      registrations: null,
      file_downloads: null,
      quote_starts: null,
      total_enquiries: null,
      cost_per_lead: null,
      wcr_pct: null,
      days_with_data: null,
      earliest: null,
      latest: null,
    });
  }

  for (const [month, traffic] of Array.from(sessionsByMonth.entries())) {
    const ev = eventsByMonth.get(month) ?? { total_enquiries: 0 };
    const spend = spendByMonth.get(month) ?? 0;
    const totalEnq = ev.total_enquiries ?? 0;
    rows.push({
      client: clientId,
      client_id: uuid,
      month,
      month_date: month,
      data_source: "ga4",
      channel: null,
      campaign_name: null,
      campaign_type: null,
      impressions: null,
      reach: null,
      clicks: null,
      spend: null,
      ctr_pct: null,
      cpc: null,
      conversions: null,
      cost_per_conv: null,
      post_engagements: null,
      traffic,
      vehicle_views: null,
      saved_vehicles: null,
      form_starts: null,
      form_submissions: ev["form_submissions"] ?? null,
      hire_form_submissions: null,
      contact_form_submissions: null,
      website_calls: ev["website_calls"] ?? null,
      website_chat: null,
      email_link_clicks: ev["email_link_clicks"] ?? null,
      messenger_leads: null,
      booking_completes: ev["booking_completes"] ?? null,
      registrations: ev["registrations"] ?? null,
      file_downloads: null,
      quote_starts: null,
      total_enquiries: totalEnq,
      cost_per_lead: totalEnq > 0 ? spend / totalEnq : null,
      wcr_pct: traffic > 0 ? (totalEnq / traffic) * 100 : null,
      days_with_data: null,
      earliest: null,
      latest: null,
    });
  }

  rows.sort((a, b) => b.month_date.localeCompare(a.month_date));

  return NextResponse.json({ rows });
}
