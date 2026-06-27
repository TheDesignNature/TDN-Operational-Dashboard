import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { getClientUuid, BOOKING_CLIENTS } from "@/lib/clientIds";

export const runtime = "nodejs";

/**
 * Builds the dashboard's MonthlyReportRow shape from `report_monthly_comparison`,
 * which already gives us per-metric current/previous-month/previous-year values
 * and pre-computed mom_change/yoy_change FRACTIONS (e.g. -0.28, not -28).
 *
 * report_monthly_comparison rows are one-per-(month, client_id, metric_name) where
 * metric_name in: sessions, users, demand_signals, enquiries, cost, impressions, clicks.
 * We pivot those into one row per month here, server-side, so the client only ever
 * deals with the flat MonthlyReportRow shape it already expects.
 */

interface ComparisonRow {
  month: string;
  metric_name: string;
  current_value: string | number | null;
  previous_month_value: string | number | null;
  previous_year_value: string | number | null;
  mom_change: string | number | null;
  yoy_change: string | number | null;
}

function num(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function pct(fraction: number | null): number | null {
  return fraction === null ? null : fraction * 100;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;
  const uuid = getClientUuid(clientId);
  if (!uuid) {
    return NextResponse.json({ rows: [] });
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("report_monthly_comparison")
    .select("month, metric_name, current_value, previous_month_value, previous_year_value, mom_change, yoy_change")
    .eq("client_id", uuid)
    .order("month", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as ComparisonRow[];
  const byMonth = new Map<string, Record<string, ComparisonRow>>();
  for (const row of rows) {
    if (!byMonth.has(row.month)) byMonth.set(row.month, {});
    byMonth.get(row.month)![row.metric_name] = row;
  }

  const isBooking = BOOKING_CLIENTS.has(clientId);

  const result = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, metrics]) => {
      const cost = metrics["cost"];
      const sessions = metrics["sessions"];
      const enquiries = metrics["enquiries"];

      const spend = num(cost?.current_value) ?? 0;
      const prevSpend = num(cost?.previous_month_value);
      const traffic = num(sessions?.current_value) ?? 0;
      const prevTraffic = num(sessions?.previous_month_value);
      const enq = num(enquiries?.current_value) ?? 0;
      const prevEnq = num(enquiries?.previous_month_value);

      const cpl = enq > 0 ? spend / enq : null;
      const prevCpl = prevEnq && prevEnq > 0 && prevSpend !== null ? prevSpend / prevEnq : null;
      const momCpl = prevCpl && cpl !== null ? ((cpl - prevCpl) / prevCpl) * 100 : null;

      const wcr = traffic > 0 ? (enq / traffic) * 100 : null;
      const prevWcr = prevTraffic && prevTraffic > 0 && prevEnq !== null ? (prevEnq / prevTraffic) * 100 : null;
      const momWcr = prevWcr && wcr !== null ? ((wcr - prevWcr) / prevWcr) * 100 : null;

      const monthLabel = new Date(month + "T00:00:00").toLocaleDateString("en-AU", {
        month: "short",
        year: "numeric",
      });

      return {
        metric_date: month,
        month_label: monthLabel,
        spend,
        traffic,
        enquiries: isBooking ? null : enq,
        bookings: isBooking ? enq : null,
        cost_per_lead: isBooking ? null : cpl,
        cost_per_booking: isBooking ? cpl : null,
        website_conversion_rate_pct: wcr,
        mom_spend_pct: pct(num(cost?.mom_change)),
        mom_traffic_pct: pct(num(sessions?.mom_change)),
        mom_enquiries_pct: isBooking ? null : pct(num(enquiries?.mom_change)),
        mom_bookings_pct: isBooking ? pct(num(enquiries?.mom_change)) : null,
        mom_cpl_pct: isBooking ? null : momCpl,
        mom_cpb_pct: isBooking ? momCpl : null,
        mom_website_conversion_rate_pct: momWcr,
      };
    });

  return NextResponse.json({ rows: result });
}
