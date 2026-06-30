import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { getClientUuid, BOOKING_CLIENTS } from "@/lib/clientIds";
import { getLatestClientSnapshot } from "@/lib/clientSnapshot";
import { computeClientInsights } from "@/lib/insightsEngine";
import type { Insight } from "@/types";

export const runtime = "nodejs";

/**
 * Per-client Insights + Suggested actions for InsightsList.tsx.
 * Replaces getInsightsForClient() (openClawService mock) and the static
 * SUGGESTED_ACTIONS map that used to live in InsightsList.tsx itself.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;
  const uuid = getClientUuid(clientId);
  if (!uuid) {
    return NextResponse.json({ insights: [], suggestedActions: [] });
  }

  const supabase = getSupabaseClient();

  let snapshot;
  try {
    snapshot = await getLatestClientSnapshot(supabase, uuid);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Query failed" }, { status: 500 });
  }

  const isBooking = BOOKING_CLIENTS.has(clientId);
  const result = computeClientInsights(
    clientId,
    isBooking,
    snapshot ?? {
      spend: 0,
      traffic: 0,
      value: 0,
      cpl: null,
      wcr: null,
      momSpendPct: null,
      momTrafficPct: null,
      momValuePct: null,
      momCplPct: null,
      momWcrPct: null,
    }
  );

  const now = new Date().toISOString();
  const insights: Insight[] = result.insights.map((ins, i) => ({
    ...ins,
    id: `${clientId}-insight-${i}`,
    clientId,
    createdAt: now,
  }));

  return NextResponse.json({ insights, suggestedActions: result.suggestedActions });
}
