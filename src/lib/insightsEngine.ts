/**
 * Insights engine.
 *
 * Replaces the old OpenClaw mock data with deterministic, threshold-based
 * insights computed directly from real month-on-month numbers already in
 * Supabase (report_monthly_comparison). No LLM/AI call involved — every
 * sentence here is generated from an actual mom_change/value, not invented.
 *
 * Design choices worth knowing:
 * - Thresholds below are reasonable starting heuristics, not tuned against
 *   real campaign history. Adjust the *_THRESHOLD constants as you see how
 *   they perform against real months.
 * - We deliberately avoid claiming things the data can't support — e.g. the
 *   old mock said "spend tracking 35% under budget" which assumes a budget
 *   target we don't have. We say "spend down X% month-on-month" instead.
 * - A client can trigger more than one rule in the same month (e.g. enquiry
 *   drop + CPL rise) — all triggered rules become insights; only
 *   warning/critical ones also become alerts (Alert type has no "info").
 */

import type { Alert, Insight, SummaryMetric } from "@/types";
import { formatCurrency, formatNumber, formatPercentAbsolute } from "@/lib/formatters";

export interface ClientMetricsSnapshot {
  spend: number;
  traffic: number;
  /** enquiries, or bookings for BOOKING_CLIENTS */
  value: number;
  cpl: number | null;
  wcr: number | null;
  momSpendPct: number | null;
  momTrafficPct: number | null;
  momValuePct: number | null;
  momCplPct: number | null;
  momWcrPct: number | null;
}

export interface ClientInsightResult {
  status: "normal" | "watch" | "action";
  statusMessage: string;
  summaryMetrics: SummaryMetric[];
  alerts: Omit<Alert, "id" | "createdAt">[];
  insights: Omit<Insight, "id" | "createdAt">[];
  suggestedActions: string[];
}

// ── Thresholds ───────────────────────────────────────────────────
const ENQ_DROP_CRITICAL = -20;
const ENQ_DROP_WARNING = -10;
const ENQ_STRONG = 15;
const CPL_RISE_CRITICAL = 30;
const CPL_RISE_WARNING = 15;
const TRAFFIC_UP_FOR_CONV_FLAT = 10;
const SPEND_DROP_WARNING = -25;
const STABLE_BAND = 10; // within +/- this % counts as "no real change"

const DEFAULT_ACTIONS = [
  "Review campaign performance vs the previous month in detail",
  "Check search term and audience reports for quality drift",
  "Audit ad creative performance — identify top and bottom performers",
];

function round(n: number | null): number | undefined {
  if (n === null || n === undefined || !Number.isFinite(n)) return undefined;
  return Math.round(n);
}

export function computeClientInsights(
  clientName: string,
  isBooking: boolean,
  s: ClientMetricsSnapshot
): ClientInsightResult {
  const unit = isBooking ? "bookings" : "enquiries";
  const unitSingular = isBooking ? "booking" : "enquiry";
  const costLabel = isBooking ? "cost per booking" : "cost per lead";

  const alerts: Omit<Alert, "id" | "createdAt">[] = [];
  const insights: Omit<Insight, "id" | "createdAt">[] = [];
  const suggestedActions: string[] = [];
  let triggeredAnything = false;

  // ── Rule: value (enquiries/bookings) dropped ──
  if (s.momValuePct !== null && s.momValuePct <= ENQ_DROP_WARNING) {
    triggeredAnything = true;
    const critical = s.momValuePct <= ENQ_DROP_CRITICAL;
    const pct = Math.abs(Math.round(s.momValuePct));
    const trafficNote =
      s.momTrafficPct !== null && Math.abs(s.momTrafficPct) < Math.abs(s.momValuePct) / 2
        ? ` Traffic is comparatively stable (${formatPercentAbsolute(Math.abs(s.momTrafficPct))} change) — this looks like a conversion problem, not a traffic problem.`
        : "";
    alerts.push({
      clientId: "",
      severity: critical ? "critical" : "warning",
      message: `${unit[0].toUpperCase()}${unit.slice(1)} dropped ${pct}% month-on-month`,
      metric: unitSingular,
      deltaPercent: Math.round(s.momValuePct),
    });
    insights.push({
      clientId: "",
      severity: critical ? "critical" : "warning",
      title: `${unit[0].toUpperCase()}${unit.slice(1)} volume falling`,
      message: `${unit[0].toUpperCase()}${unit.slice(1)} are down ${pct}% compared to last month.${trafficNote} Review landing page performance and search term quality before adjusting bids.`,
    });
    suggestedActions.push(
      "Audit landing page load speed and form functionality on mobile",
      "Review search term report for audience quality — look for broad match bleed",
      "Check auction insights for increased competitor activity"
    );
  }

  // ── Rule: cost per lead/booking rose ──
  if (s.momCplPct !== null && s.momCplPct >= CPL_RISE_WARNING) {
    triggeredAnything = true;
    const critical = s.momCplPct >= CPL_RISE_CRITICAL;
    const pct = Math.round(s.momCplPct);
    alerts.push({
      clientId: "",
      severity: critical ? "critical" : "warning",
      message: `Cost per ${unitSingular} increased ${pct}% — campaign efficiency falling${critical ? " sharply" : ""}`,
      metric: "cost_per_lead",
      deltaPercent: pct,
    });
    insights.push({
      clientId: "",
      severity: critical ? "critical" : "warning",
      title: "Cost efficiency worsening",
      message: `${costLabel[0].toUpperCase()}${costLabel.slice(1)} has risen ${pct}%${s.momSpendPct !== null && Math.abs(s.momSpendPct) < 5 ? " while spend stayed roughly flat" : ""}. This suggests the audience is becoming harder to reach at current bids, or competitor activity has increased. Check auction insights.`,
    });
    suggestedActions.push(
      "Review campaign structure and bid strategy for efficiency",
      "Audit negative keyword list — CPL creep often signals audience pollution"
    );
  }

  // ── Rule: traffic growing but value not keeping pace ──
  if (
    s.momTrafficPct !== null &&
    s.momTrafficPct >= TRAFFIC_UP_FOR_CONV_FLAT &&
    s.momValuePct !== null &&
    s.momValuePct < s.momTrafficPct / 2
  ) {
    triggeredAnything = true;
    alerts.push({
      clientId: "",
      severity: "warning",
      message: `Traffic up ${Math.round(s.momTrafficPct)}% but ${unit} only ${s.momValuePct >= 0 ? "+" : ""}${Math.round(s.momValuePct)}% — conversion lagging growth`,
      metric: "website_conversion_rate",
      deltaPercent: Math.round(s.momWcrPct ?? 0),
    });
    insights.push({
      clientId: "",
      severity: "warning",
      title: "Conversion rate lagging traffic growth",
      message: `Traffic grew ${Math.round(s.momTrafficPct)}% this month but ${unit} grew only ${Math.round(s.momValuePct)}%. If this continues, the extra traffic spend won't deliver proportional return. Check the most-visited landing pages for friction points.`,
    });
    suggestedActions.push(
      "Review highest-traffic landing pages for conversion friction",
      "Check form completion rate vs form view rate",
      "Test page speed on mobile — a common cause of flat conversion"
    );
  }

  // ── Rule: spend pacing down ──
  if (s.momSpendPct !== null && s.momSpendPct <= SPEND_DROP_WARNING) {
    triggeredAnything = true;
    const pct = Math.abs(Math.round(s.momSpendPct));
    alerts.push({
      clientId: "",
      severity: "warning",
      message: `Spend down ${pct}% month-on-month — worth checking delivery and budget pacing`,
      metric: "spend",
      deltaPercent: Math.round(s.momSpendPct),
    });
    insights.push({
      clientId: "",
      severity: "warning",
      title: "Spend pacing down",
      message: `Spend is down ${pct}% compared to last month. Could be a delivery issue (audience exhaustion, bid caps, ad disapprovals) or an intentional pull-back — worth confirming which.`,
    });
    suggestedActions.push(
      "Check all active ad approval statuses",
      "Review audience size and bid caps for delivery issues"
    );
  }

  // ── Rule: strong month (positive, info-only — no alert) ──
  if (
    !triggeredAnything &&
    s.momValuePct !== null &&
    s.momValuePct >= ENQ_STRONG &&
    (s.momCplPct === null || s.momCplPct <= 5)
  ) {
    triggeredAnything = true;
    insights.push({
      clientId: "",
      severity: "info",
      title: "Above-target performance",
      message: `${unit[0].toUpperCase()}${unit.slice(1)} are up ${Math.round(s.momValuePct)}% with ${costLabel} ${s.momCplPct !== null && s.momCplPct < -2 ? "down" : "flat"}. Performance is strong — consider a budget increase proposal for next month.`,
    });
    suggestedActions.push(
      "Performance is strong — consider proposing a budget increase for next month",
      "Document what's working this month so it can be replicated"
    );
  }

  // ── Rule: not enough history yet ──
  if (s.momValuePct === null && s.momSpendPct === null && s.momTrafficPct === null) {
    triggeredAnything = true;
    insights.push({
      clientId: "",
      severity: "info",
      title: "Not enough history yet",
      message: "There isn't a prior month to compare against yet, so month-on-month trends aren't available. Revisit once another full month of data has landed.",
    });
    suggestedActions.push(...DEFAULT_ACTIONS);
  }

  // ── Rule: stable (default, nothing else triggered) ──
  if (!triggeredAnything) {
    insights.push({
      clientId: "",
      severity: "info",
      title: "Steady performance this month",
      message: "All core metrics are within 10% of last month. No immediate action required.",
    });
    suggestedActions.push(...DEFAULT_ACTIONS);
  }

  const hasCritical = alerts.some((a) => a.severity === "critical");
  const hasWarning = alerts.some((a) => a.severity === "warning");
  const status: ClientInsightResult["status"] = hasCritical ? "action" : hasWarning ? "watch" : "normal";

  const statusMessage =
    alerts[0]?.message ?? insights[0]?.message.split(". ")[0] ?? "Stable performance across all metrics this month";

  const summaryMetrics: SummaryMetric[] = [
    { label: "Spend", value: formatCurrency(s.spend), delta: round(s.momSpendPct) },
    { label: unit[0].toUpperCase() + unit.slice(1), value: formatNumber(s.value), delta: round(s.momValuePct) },
    {
      label: isBooking ? "Cost/booking" : "CPL",
      value: s.cpl !== null ? formatCurrency(s.cpl) : "—",
      delta: round(s.momCplPct),
    },
    {
      label: "Conv. Rate",
      value: s.wcr !== null ? formatPercentAbsolute(s.wcr) : "—",
      delta: round(s.momWcrPct),
    },
  ];

  // De-dupe suggested actions while preserving order, cap at 4
  const seen = new Set<string>();
  const dedupedActions = suggestedActions.filter((a) => {
    if (seen.has(a)) return false;
    seen.add(a);
    return true;
  }).slice(0, 4);

  return { status, statusMessage, summaryMetrics, alerts, insights, suggestedActions: dedupedActions };
}
