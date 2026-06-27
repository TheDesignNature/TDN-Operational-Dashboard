import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClientMetricsSnapshot } from "@/lib/insightsEngine";

/**
 * Pulls the most recent month's spend/traffic/value numbers (and their
 * mom_change%) for one client out of report_monthly_comparison, in the
 * exact same shape the insights engine expects.
 *
 * Mirrors the math already used in /api/clients/[id]/report — kept as a
 * separate small query (rather than reusing that route's response) so the
 * insights engine only ever needs the latest month, not the full history.
 */

interface Row {
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

export async function getLatestClientSnapshot(
  supabase: SupabaseClient,
  clientUuid: string
): Promise<ClientMetricsSnapshot | null> {
  const { data, error } = await supabase
    .from("report_monthly_comparison")
    .select("month, metric_name, current_value, previous_month_value, mom_change")
    .eq("client_id", clientUuid);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return null;

  const byMonth = new Map<string, Record<string, Row>>();
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
  const prevTraffic = num(sessions?.previous_month_value);
  const value = num(enquiries?.current_value) ?? 0;
  const prevValue = num(enquiries?.previous_month_value);

  const cpl = value > 0 ? spend / value : null;
  const prevCpl = prevValue && prevValue > 0 && prevSpend !== null ? prevSpend / prevValue : null;
  const momCplPct = prevCpl && cpl !== null ? ((cpl - prevCpl) / prevCpl) * 100 : null;

  const wcr = traffic > 0 ? (value / traffic) * 100 : null;
  const prevWcr = prevTraffic && prevTraffic > 0 && prevValue !== null ? (prevValue / prevTraffic) * 100 : null;
  const momWcrPct = prevWcr && wcr !== null ? ((wcr - prevWcr) / prevWcr) * 100 : null;

  return {
    spend,
    traffic,
    value,
    cpl,
    wcr,
    momSpendPct: pct(num(cost?.mom_change)),
    momTrafficPct: pct(num(sessions?.mom_change)),
    momValuePct: pct(num(enquiries?.mom_change)),
    momCplPct,
    momWcrPct,
  };
}
