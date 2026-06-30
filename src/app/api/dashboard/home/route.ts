import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { CLIENT_UUIDS } from "@/lib/clientIds";

export const runtime = "nodejs";

/**
 * Backs the home dashboard (src/app/page.tsx).
 *
 * page.tsx used to call getSupabaseClient() directly from the browser
 * against eight legacy tables (powershift_monthly_report, kkcs_monthly_report,
 * etc.) that no longer exist. Two fatal bugs: (1) SUPABASE_SERVICE_ROLE_KEY is
 * server-only and is never sent to the browser, so that call always threw;
 * (2) none of those eight tables exist in the database.
 *
 * This route does the same per-client "prior closed month + current MTD"
 * lookup server-side, against the real report_monthly_comparison view and
 * fact_*_daily tables — the same data sources already used by
 * /api/clients/[id]/report and /api/clients/[id]/mtd.
 */

interface ComparisonRow {
  month: string;
  metric_name: string;
  current_value: string | number | null;
  previous_month_value: string | number | null;
  mom_change: string | number | null;
}

function num(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function pct(fraction: number | null): number | null {
  return fraction === null ? null : fraction * 100;
}

async function getLatestClosedMonth(
  supabase: ReturnType<typeof getSupabaseClient>,
  uuid: string
) {
  const { data, error } = await supabase
    .from("report_monthly_comparison")
    .select("month, metric_name, current_value, previous_month_value, mom_change")
    .eq("client_id", uuid);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as ComparisonRow[];
  if (rows.length === 0) return null;

  const byMonth = new Map<string, Record<string, ComparisonRow>>();
  for (const row of rows) {
    if (!byMonth.has(row.month)) byMonth.set(row.month, {});
    byMonth.get(row.month)![row.metric_name] = row;
  }
  const latestMonth = Array.from(byMonth.keys()).sort().reverse()[0];
  const metrics = byMonth.get(latestMonth)!;

  const cost = metrics["cost"];
  const sessions = metrics["sessions"];
  const enquiries = metrics["enquiries"];

  const spend = num(cost?.current_value) ?? 0;
  const prevSpend = num(cost?.previous_month_value);
  const traffic = num(sessions?.current_value) ?? 0;
  const enq = num(enquiries?.current_value) ?? 0;
  const prevEnq = num(enquiries?.previous_month_value);

  const cpl = enq > 0 ? spend / enq : null;
  const prevCpl = prevEnq && prevEnq > 0 && prevSpend !== null ? prevSpend / prevEnq : null;
  const momCpl = prevCpl && cpl !== null ? ((cpl - prevCpl) / prevCpl) * 100 : null;

  const monthLabel = new Date(latestMonth + "T00:00:00").toLocaleDateString("en-AU", {
    month: "short",
    year: "numeric",
  });

  return {
    month_label: monthLabel,
    spend,
    traffic,
    enquiries: enq,
    cpl,
    mom_spend: pct(num(cost?.mom_change)),
    mom_traffic: pct(num(sessions?.mom_change)),
    mom_enquiries: pct(num(enquiries?.mom_change)),
    mom_cpl: momCpl,
  };
}

async function getMtd(supabase: ReturnType<typeof getSupabaseClient>, uuid: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const todayStr = now.toISOString().split("T")[0];

  const [paidRes, websiteRes, eventsRes] = await Promise.all([
    supabase
      .from("fact_paid_campaign_daily")
      .select("date, cost")
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

  if (paidRes.error || websiteRes.error || eventsRes.error) return null;

  const paidRows = paidRes.data ?? [];
  const websiteRows = websiteRes.data ?? [];
  const eventRows = eventsRes.data ?? [];

  const spend = paidRows.reduce((s, r) => s + (Number(r.cost) || 0), 0);
  const traffic = websiteRows.reduce((s, r) => s + (Number(r.sessions) || 0), 0);
  const enquiries = eventRows.reduce((s, r) => s + (Number(r.event_count) || 0), 0);

  const datesWithData = new Set([
    ...paidRows.map((r) => r.date),
    ...websiteRows.map((r) => r.date),
  ]);
  if (datesWithData.size === 0) return null;

  return {
    month_label: now.toLocaleDateString("en-AU", { month: "long", year: "numeric" }),
    spend_mtd: spend,
    traffic_mtd: traffic,
    enquiries_mtd: enquiries,
  };
}

export async function GET() {
  let supabase;
  try {
    supabase = getSupabaseClient();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Supabase not configured" },
      { status: 500 }
    );
  }

  const entries = Object.entries(CLIENT_UUIDS);

  const results = await Promise.all(
    entries.map(async ([slug, uuid]) => {
      const [closed, mtd] = await Promise.all([
        getLatestClosedMonth(supabase, uuid).catch(() => null),
        getMtd(supabase, uuid).catch(() => null),
      ]);
      return { slug, closed, mtd };
    })
  );

  return NextResponse.json({ clients: results });
}
