"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { ClientHeader } from "@/components/client-detail/ClientHeader";
import { InsightsList } from "@/components/client-detail/InsightsList";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { getClientById } from "@/services/clientsService";
import {
  getPowershiftMonthlyReport,
  getPowershiftMTD,
  type PowershiftMTD,
} from "@/services/powershiftService";
import { formatCurrency, formatNumber, formatPercentAbsolute } from "@/lib/formatters";
import type { Client, PowershiftMonthlyRow } from "@/types";

// ── Delta ─────────────────────────────────────────────────────

function Delta({ value, invert = false, neutral = false }: {
  value: number | null | undefined;
  invert?: boolean;
  neutral?: boolean;
}) {
  if (value === null || value === undefined) return <span className="text-2xs text-teal/20">—</span>;
  const isPositive = value >= 0;
  const isGood = neutral ? null : invert ? !isPositive : isPositive;
  const color = neutral || isGood === null ? "text-teal/40"
    : isGood ? "text-emerald-600" : "text-red-500";
  return (
    <span className={`text-xs font-medium ${color}`}>
      {!neutral && (isPositive ? "↑" : "↓")}{Math.abs(value).toFixed(1)}%
    </span>
  );
}

// ── Section header ────────────────────────────────────────────

function SectionHeader({ title, badge, live = false }: {
  title: string; badge?: string; live?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <h2 className="font-heading text-base font-semibold text-teal tracking-wide">{title}</h2>
      {live && (
        <span className="flex items-center gap-1 text-2xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
          <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse inline-block" />
          Live
        </span>
      )}
      {badge && (
        <span className="text-2xs text-teal/30 bg-sand/60 px-2 py-0.5 rounded border border-sand/40">{badge}</span>
      )}
    </div>
  );
}

// ── Metric card ───────────────────────────────────────────────

function MetricCard({ label, value, delta, invert = false, neutral = false }: {
  label: string; value: string;
  delta?: number | null; invert?: boolean; neutral?: boolean;
}) {
  return (
    <div className="bg-white rounded-card border border-sand/40 p-4">
      <p className="text-2xs font-medium text-teal/40 uppercase tracking-wider mb-1.5">{label}</p>
      <p className="font-heading text-2xl font-semibold text-teal leading-none mb-1.5">{value}</p>
      {delta !== undefined && <Delta value={delta} invert={invert} neutral={neutral} />}
    </div>
  );
}

function SectionDivider() {
  return <div className="border-t border-sand/40 my-8" />;
}

// ── 13-month chart colours ────────────────────────────────────

const CHART_COLORS = {
  teal: "#1C3B44",
  green: "#AFBAAB",
  blue: "#A1B4B7",
  sand: "#C8BDAC",
  accent: "#2D6A7F",
};

// ── Enquiries 13-month chart ──────────────────────────────────

function EnquiriesChart({ data }: { data: PowershiftMonthlyRow[] }) {
  const last13 = data.slice(-13);

  // Build YoY comparison — match month from 12 months prior
  const chartData = last13.map((row, i) => {
    const yoyIndex = i - 12;
    const yoyRow = yoyIndex >= 0 ? data[data.indexOf(row) - 12] : null;
    return {
      month: row.month_label.split(" ")[0], // "Apr" from "Apr 2026"
      thisYear: row.enquiries,
      lastYear: yoyRow?.enquiries ?? null,
    };
  });

  return (
    <div className="bg-white rounded-card border border-sand/40 p-5 mb-4">
      <p className="font-heading text-sm font-semibold text-teal mb-4">
        Total enquiries — 13 months
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#C8BDAC40" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#1C3B4480" }} />
          <YAxis tick={{ fontSize: 11, fill: "#1C3B4480" }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderColor: "#C8BDAC", borderRadius: 8 }}
            formatter={(value: any, name: string) => [value, name === "thisYear" ? "This year" : "Last year"]}
          />
          <Legend formatter={(value) => value === "thisYear" ? "This year" : "Last year"} />
          <Line type="monotone" dataKey="thisYear" stroke={CHART_COLORS.teal} strokeWidth={2} dot={{ r: 3 }} name="thisYear" />
          <Line type="monotone" dataKey="lastYear" stroke={CHART_COLORS.sand} strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="lastYear" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── CPL 13-month chart ────────────────────────────────────────

function CPLChart({ data }: { data: PowershiftMonthlyRow[] }) {
  const last13 = data.slice(-13).map((row) => ({
    month: row.month_label.split(" ")[0],
    cpl: row.cost_per_lead,
  }));

  return (
    <div className="bg-white rounded-card border border-sand/40 p-5 mb-4">
      <p className="font-heading text-sm font-semibold text-teal mb-4">
        Cost per lead — 13 months
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={last13} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#C8BDAC40" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#1C3B4480" }} />
          <YAxis tick={{ fontSize: 11, fill: "#1C3B4480" }} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderColor: "#C8BDAC", borderRadius: 8 }}
            formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "CPL"]}
          />
          <Bar dataKey="cpl" fill={CHART_COLORS.teal} radius={[3, 3, 0, 0]} name="CPL" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Spend by channel 13-month chart ──────────────────────────

function SpendByChannelChart({ clientId }: { clientId: string }) {
  const [channelData, setChannelData] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const { getSupabaseClient } = await import("@/lib/supabase");
      const supabase = getSupabaseClient();

      // Get client UUID from slug
      const clientMap: Record<string, string> = {
        "powershift": "b2d53ecf-f700-42e4-93e9-8cea66fcede6",
        "kkcs": "b04e39ae-ef5f-43dc-aeed-76959567f63a",
        "caloundra-city-auto": "2144357d-8438-4d24-9fe7-c1d46cdf37b4",
        "caloundra-mazda": "08bcfac7-1032-4279-9bc0-2566c9284fc5",
      };
      const uuid = clientMap[clientId];
      if (!uuid) return;

      const { data } = await supabase
        .from("metrics")
        .select("metric_date, data_source, spend")
        .eq("client_id", uuid)
        .in("data_source", ["google_ads", "meta_ads", "manual"])
        .gte("metric_date", new Date(new Date().setMonth(new Date().getMonth() - 13)).toISOString().split("T")[0])
        .order("metric_date");

      if (!data) return;

      // Aggregate by month + channel
      const byMonth: Record<string, { google: number; meta: number; other: number }> = {};
      data.forEach((row: any) => {
        const month = row.metric_date.substring(0, 7);
        if (!byMonth[month]) byMonth[month] = { google: 0, meta: 0, other: 0 };
        const spend = row.spend ?? 0;
        if (row.data_source === "google_ads") byMonth[month].google += spend;
        else if (row.data_source === "meta_ads") byMonth[month].meta += spend;
        else if (row.data_source === "manual") byMonth[month].other += spend;
      });

      setChannelData(
        Object.entries(byMonth)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-13)
          .map(([month, v]) => ({
            month: new Date(month + "-01").toLocaleDateString("en-AU", { month: "short" }),
            Google: Math.round(v.google * 100) / 100,
            Meta: Math.round(v.meta * 100) / 100,
          }))
      );
    }
    load();
  }, [clientId]);

  if (!channelData.length) return null;

  return (
    <div className="bg-white rounded-card border border-sand/40 p-5 mb-4">
      <p className="font-heading text-sm font-semibold text-teal mb-4">
        Spend by channel — 13 months
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={channelData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#C8BDAC40" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#1C3B4480" }} />
          <YAxis tick={{ fontSize: 11, fill: "#1C3B4480" }} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderColor: "#C8BDAC", borderRadius: 8 }}
            formatter={(value: any, name: string) => [`$${Number(value).toFixed(2)}`, name]}
          />
          <Legend />
          <Bar dataKey="Google" stackId="a" fill={CHART_COLORS.teal} radius={[0, 0, 0, 0]} />
          <Bar dataKey="Meta" stackId="a" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Monthly table ─────────────────────────────────────────────

function HistoryTable({ data }: { data: PowershiftMonthlyRow[] }) {
  const rows = [...data].reverse();
  return (
    <div className="bg-white rounded-card border border-sand/40 overflow-hidden mb-4">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-sand/40 bg-stone/50">
              {["Month", "Spend", "Traffic", "Enquiries", "CPL", "WCR%", "MoM Enq"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-teal/50 uppercase tracking-wider text-2xs whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const mom = row.mom_enquiries_pct;
              const momColor = mom === null ? "text-teal/30"
                : mom >= 0 ? "text-emerald-600" : "text-red-500";
              return (
                <tr key={i} className="border-b border-sand/20 hover:bg-stone/30 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-teal whitespace-nowrap">{row.month_label}</td>
                  <td className="px-4 py-2.5 text-teal/70">{formatCurrency(row.spend)}</td>
                  <td className="px-4 py-2.5 text-teal/70">{formatNumber(row.traffic)}</td>
                  <td className="px-4 py-2.5 text-teal/70">{formatNumber(row.enquiries)}</td>
                  <td className="px-4 py-2.5 text-teal/70">{row.cost_per_lead ? formatCurrency(row.cost_per_lead) : "—"}</td>
                  <td className="px-4 py-2.5 text-teal/70">{row.website_conversion_rate_pct ? formatPercentAbsolute(row.website_conversion_rate_pct) : "—"}</td>
                  <td className={`px-4 py-2.5 font-medium ${momColor}`}>
                    {mom !== null ? `${mom >= 0 ? "↑" : "↓"}${Math.abs(mom).toFixed(1)}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [reportData, setReportData] = useState<PowershiftMonthlyRow[]>([]);
  const [mtd, setMtd] = useState<PowershiftMTD | null>(null);
  const [clientLoading, setClientLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setClientLoading(true);
      setClientError(null);
      try {
        const c = await getClientById(clientId);
        if (!c) { setClientError("Client not found."); return; }
        setClient(c);
        if (clientId === "powershift") {
          setReportLoading(true);
          try {
            const [rows, mtdData] = await Promise.all([
              getPowershiftMonthlyReport(),
              getPowershiftMTD(),
            ]);
            setReportData(rows);
            setMtd(mtdData);
          } catch (e) {
            setReportError(e instanceof Error ? e.message : "Failed to load report data");
          } finally {
            setReportLoading(false);
          }
        }
      } catch (e) {
        setClientError(e instanceof Error ? e.message : "Failed to load client");
      } finally {
        setClientLoading(false);
      }
    }
    load();
  }, [clientId]);

  if (clientLoading) return <PageLoader label="Loading client..." />;
  if (clientError || !client) {
    return <ErrorState title="Client not found" message={clientError ?? "This client does not exist or could not be loaded."} />;
  }

  const isPowershift = clientId === "powershift";

  // Derive latest CLOSED month from data (not from calendar)
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const closedRows = reportData.filter((r: any) => r.metric_date < currentMonthStart);
  const latest = closedRows.length > 0 ? closedRows[closedRows.length - 1] : null;

  // Current open month rows
  const currentMonthRows = reportData.filter((r: any) => r.metric_date >= currentMonthStart);
  const current = currentMonthRows.length > 0 ? currentMonthRows[0] : null;

  const mtdLabel = now.toLocaleDateString("en-AU", { month: "long", year: "numeric" });

  return (
    <div className="max-w-5xl mx-auto">
      <ClientHeader client={client} />

      {isPowershift && (
        <>
          {/* ── SECTION 1: Month to Date ── */}
          {(mtd || current) && (
            <>
              <SectionHeader
                title={`Month to date — ${mtd?.month_label ?? mtdLabel}`}
                badge={mtd ? `${mtd.days_tracked} days · updated ${mtd.last_updated}` : "In progress"}
                live
              />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
                <MetricCard label="Spend MTD" value={formatCurrency(mtd?.spend_mtd ?? current?.spend ?? 0)} neutral />
                <MetricCard label="Clicks MTD" value={formatNumber(mtd?.clicks_mtd ?? current?.clicks ?? 0)} />
                <MetricCard label="CPC MTD" value={mtd?.cpc_mtd ? formatCurrency(mtd.cpc_mtd) : "—"} invert />
                <MetricCard label="Enquiries MTD" value={formatNumber(mtd?.enquiries_mtd ?? current?.enquiries ?? 0)} />
                <MetricCard label="Traffic MTD" value={formatNumber(mtd?.traffic_mtd ?? current?.traffic ?? 0)} />
                <MetricCard label="CTR MTD" value={mtd?.ctr_mtd ? formatPercentAbsolute(mtd.ctr_mtd) : "—"} />
                <MetricCard label="Cost per enquiry" value={mtd?.cost_per_enquiry_mtd ? formatCurrency(mtd.cost_per_enquiry_mtd) : "—"} invert />
                <MetricCard label="Conv. rate MTD" value={mtd?.conversion_rate_mtd ? formatPercentAbsolute(mtd.conversion_rate_mtd) : "—"} />
              </div>
            </>
          )}

          <SectionDivider />

          {/* ── SECTION 2: Previous closed month ── */}
          {latest && (
            <>
              <SectionHeader
                title={`Previous month — ${latest.month_label}`}
                badge="vs month prior"
              />
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-2">
                <MetricCard label="Spend" value={formatCurrency(latest.spend)} delta={latest.mom_spend_pct} neutral />
                <MetricCard label="Traffic" value={formatNumber(latest.traffic)} delta={latest.mom_traffic_pct} />
                <MetricCard label="Enquiries" value={formatNumber(latest.enquiries)} delta={latest.mom_enquiries_pct} />
                <MetricCard label="Cost per lead" value={formatCurrency(latest.cost_per_lead)} delta={latest.mom_cpl_pct} invert />
                <MetricCard label="Website conv. rate" value={formatPercentAbsolute(latest.website_conversion_rate_pct)} delta={latest.mom_website_conversion_rate_pct} />
              </div>
            </>
          )}

          <SectionDivider />

          {/* ── AI insights ── */}
          <InsightsList clientId={clientId} />

          {/* ── SECTION 3: 13-month performance ── */}
          {!reportLoading && !reportError && reportData.length > 0 && (
            <>
              <SectionHeader title="13-month performance" />
              <EnquiriesChart data={reportData} />
              <CPLChart data={reportData} />
              <SpendByChannelChart clientId={clientId} />
              <SectionHeader title="Monthly breakdown" />
              <HistoryTable data={reportData} />
            </>
          )}

          {reportLoading && <PageLoader label="Loading report data..." />}
          {reportError && <p className="text-sm text-red-500">{reportError}</p>}
        </>
      )}

      {!isPowershift && (
        <>
          <InsightsList clientId={clientId} />
          <div className="bg-white rounded-card border border-sand/40 border-dashed px-6 py-10 text-center mt-6">
            <p className="text-sm font-medium text-teal/40 mb-1">Live reporting coming soon</p>
            <p className="text-xs text-teal/30 max-w-xs mx-auto leading-relaxed">
              Historical data is loaded. Daily automation is being connected.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
