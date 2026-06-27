import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { getClientUuid } from "@/lib/clientIds";

export const runtime = "nodejs";

/**
 * Monthly Google vs Meta spend, last 13 months, from fact_paid_campaign_daily.
 * Replaces the old client-side query against a nonexistent "metrics" table.
 */
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

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 13);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("fact_paid_campaign_daily")
    .select("date, platform, cost")
    .eq("client_id", uuid)
    .in("platform", ["google_ads", "meta_ads"])
    .gte("date", cutoffStr)
    .order("date");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const byMonth: Record<string, { Google: number; Meta: number }> = {};
  for (const row of data ?? []) {
    const month = String(row.date).slice(0, 7);
    if (!byMonth[month]) byMonth[month] = { Google: 0, Meta: 0 };
    const cost = Number(row.cost) || 0;
    if (row.platform === "google_ads") byMonth[month].Google += cost;
    else if (row.platform === "meta_ads") byMonth[month].Meta += cost;
  }

  const rows = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-13)
    .map(([month, v]) => ({
      month: new Date(month + "-01").toLocaleDateString("en-AU", { month: "short" }),
      Google: Math.round(v.Google * 100) / 100,
      Meta: Math.round(v.Meta * 100) / 100,
    }));

  return NextResponse.json({ rows });
}
