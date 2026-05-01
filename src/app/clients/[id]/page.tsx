"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { ClientHeader } from "@/components/client-detail/ClientHeader";
import { InsightsList } from "@/components/client-detail/InsightsList";
import { DrillDownTable } from "@/components/client-detail/DrillDownTable";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { getClientById } from "@/services/clientsService";
import { getPowershiftMTD, type PowershiftMTD } from "@/services/powershiftService";
import {
  getClientMonthlyReport,
  getClientConfig,
  type MonthlyReportRow,
} from "@/services/clientReportService";
import { formatCurrency, formatNumber, formatPercentAbsolute } from "@/lib/formatters";
import type { Client } from "@/types";

// ── Helpers ───────────────────────────────────────────────────

function getEnquiries(row: MonthlyReportRow, isBooking: boolean): number {
  return (isBooking ? row.bookings : row.enquiries) ?? 0;
}
function getCPL(row: MonthlyReportRow, isBooking: boolean): number | null {
  return isBooking ? row.cost_per_booking : row.cost_per_lead;
}
function getMomEnq(row: MonthlyReportRow, isBooking: boolean): number | null {
  return isBooking ? row.mom_bookings_pct : row.mom_enquiries_pct;
}
function getMomCPL(row: MonthlyReportRow, isBooking: boolean): number | null {
  return isBooking ? row.mom_cpb_pct : row.mom_cpl_pct;
}

// ── Delta ─────────────────────────────────────────────────────

function Delta({ value, invert = false, neutral = false }: {
  value: number | null | undefined; invert?: boolean; neutral?: boolean;
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

const CHART_TEAL = "#1C3B44";
const CHART_SAND = "#C8BDAC";
const CHART_BLUE = "#A1B4B7";

// ── Enquiries 13-month chart ──────────────────────────────────

function EnquiriesChart({ data, label }: { data: MonthlyReportRow[]; label: string }) {
  const last13 = data.slice(-13);
  const chartData = last13.map((row) => {
    const allIdx = data.indexOf(row);
    const yoyRow = allIdx >= 12 ? data[allIdx - 12] : null;
    const enq = row.enquiries ?? row.bookings ?? 0;
    const yoyEnq = yoyRow ? (yoyRow.enquiries ?? yoyRow.bookings ?? null) : null;
    return {
      month: row.month_label.split(" ")[0],
      thisYear: enq,
      lastYear: yoyEnq,
    };
  });

  return (
    <div className="bg-white rounded-card border border-sand/40 p-5 mb-4">
      <p className="font-heading text-sm font-semibold text-teal mb-4">
        {label} — 13 months
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#C8BDAC40" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#1C3B4480" }} />
          <YAxis tick={{ fontSize: 11, fill: "#1C3B4480" }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderColor: "#C8BDAC", borderRadius: 8 }}
            formatter={(v: any, n: string) => [v, n === "thisYear" ? "This year" : "Last year"]}
          />
          <Legend formatter={(v) => v === "thisYear" ? "This year" : "Last year"} />
          <Line type="monotone" dataKey="thisYear" stroke={CHART_TEAL} strokeWidth={2} dot={{ r: 3 }} name="thisYear" />
          <Line type="monotone" dataKey="lastYear" stroke={CHART_SAND} strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="lastYear" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── CPL 13-month chart ────────────────────────────────────────

function CPLChart({ data, label, isBooking }: { data: MonthlyReportRow[]; label: string; isBooking: boolean }) {
  const last13 = data.slice(-13).map((row) => ({
    month: row.month_label.split(" ")[0],
    cpl: row.cost_per_lead ?? row.cost_per_booking,
  }));

  return (
    <div className="bg-white rounded-card border border-sand/40 p-5 mb-4">
      <p className="font-heading text-sm font-semibold text-teal mb-4">{label} — 13 months</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={last13} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#C8BDAC40" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#1C3B4480" }} />
          <YAxis tick={{ fontSize: 11, fill: "#1C3B4480" }} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderColor: "#C8BDAC", borderRadius: 8 }}
            formatter={(v: any) => [`$${Number(v).toFixed(2)}`, label]}
          />
          <Bar dataKey="cpl" fill={CHART_TEAL} radius={[3, 3, 0, 0]} name={label} />
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
      const clientUUIDs: Record<string, string> = {
        "powershift":           "b2d53ecf-f700-42e4-93e9-8cea66fcede6",
        "kkcs":                 "b04e39ae-ef5f-43dc-aeed-76959567f63a",
        "foundation-home":      "126e2bbc-95db-45da-a401-c986658f76e4",
        "study-hub":            "1c65ba78-c4bb-430d-94d0-729e16706bdf",
        "caloundra-city-auto":  "2144357d-8438-4d24-9fe7-c1d46cdf37b4",
        "caloundra-mazda":      "08bcfac7-1032-4279-9bc0-2566c9284fc5",
        "sell-a-car":           "af3cdca0-6866-427c-bfc5-0241d7fe9905",
      };
      const uuid = clientUUIDs[clientId];
      if (!uuid) return;

      const supabase = getSupabaseClient();
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 13);

      const { data } = await supabase
        .from("metrics")
        .select("metric_date, data_source, spend")
        .eq("client_id", uuid)
        .in("data_source", ["google_ads", "meta_ads"])
        .gte("metric_date", cutoff.toISOString().split("T")[0])
        .order("metric_date");

      if (!data?.length) return;

      const byMonth: Record<string, { Google: number; Meta: number }> = {};
      data.forEach((row: any) => {
        const m = row.metric_date.substring(0, 7);
        if (!byMonth[m]) byMonth[m] = { Google: 0, Meta: 0 };
        if (row.data_source === "google_ads") byMonth[m].Google += row.spend ?? 0;
        else if (row.data_source === "meta_ads") byMonth[m].Meta += row.spend ?? 0;
      });

      setChannelData(
        Object.entries(byMonth)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-13)
          .map(([month, v]) => ({
            month: new Date(month + "-01").toLocaleDateString("en-AU", { month: "short" }),
            Google: Math.round(v.Google * 100) / 100,
            Meta: Math.round(v.Meta * 100) / 100,
          }))
      );
    }
    load();
  }, [clientId]);

  if (!channelData.length) return null;

  return (
    <div className="bg-white rounded-card border border-sand/40 p-5 mb-4">
      <p className="font-heading text-sm font-semibold text-teal mb-4">Spend by channel — 13 months</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={channelData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#C8BDAC40" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#1C3B4480" }} />
          <YAxis tick={{ fontSize: 11, fill: "#1C3B4480" }} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderColor: "#C8BDAC", borderRadius: 8 }}
            formatter={(v: any, n: string) => [`$${Number(v).toFixed(2)}`, n]}
          />
          <Legend />
          <Bar dataKey="Google" stackId="a" fill={CHART_TEAL} />
          <Bar dataKey="Meta" stackId="a" fill={CHART_BLUE} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── History table ─────────────────────────────────────────────

function HistoryTable({ data, isBooking, enquiryLabel, cplLabel }: {
  data: MonthlyReportRow[];
  isBooking: boolean;
  enquiryLabel: string;
  cplLabel: string;
}) {
  const rows = [...data].reverse();
  return (
    <div className="bg-white rounded-card border border-sand/40 overflow-hidden mb-4">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-sand/40 bg-stone/50">
              {["Month", "Spend", "Traffic", enquiryLabel, cplLabel, "WCR%", "MoM"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-teal/50 uppercase tracking-wider text-2xs whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const enq = getEnquiries(row, isBooking);
              const cpl = getCPL(row, isBooking);
              const mom = getMomEnq(row, isBooking);
              const momColor = mom === null ? "text-teal/30" : mom >= 0 ? "text-emerald-600" : "text-red-500";
              return (
                <tr key={i} className="border-b border-sand/20 hover:bg-stone/30 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-teal whitespace-nowrap">{row.month_label}</td>
                  <td className="px-4 py-2.5 text-teal/70">{formatCurrency(row.spend)}</td>
                  <td className="px-4 py-2.5 text-teal/70">{formatNumber(row.traffic)}</td>
                  <td className="px-4 py-2.5 text-teal/70">{formatNumber(enq)}</td>
                  <td className="px-4 py-2.5 text-teal/70">{cpl ? formatCurrency(cpl) : "—"}</td>
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
  const [reportData, setReportData] = useState<MonthlyReportRow[]>([]);
  const [mtd, setMtd] = useState<PowershiftMTD | null>(null);
  const [clientLoading, setClientLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const config = getClientConfig(clientId);
  const isBooking = config?.isBookingClient ?? false;
  const enquiryLabel = config?.enquiryLabel ?? "Enquiries";
  const cplLabel = config?.cplLabel ?? "Cost per lead";

  useEffect(() => {
    async function load() {
      setClientLoading(true);
      setClientError(null);
      try {
        const c = await getClientById(clientId);
        if (!c) { setClientError("Client not found."); return; }
        setClient(c);

        if (config) {
          setReportLoading(true);
          try {
            const [rows, mtdData] = await Promise.allSettled([
              getClientMonthlyReport(clientId),
              clientId === "powershift" ? getPowershiftMTD() : Promise.resolve(null),
            ]);
            if (rows.status === "fulfilled") setReportData(rows.value);
            else setReportError(rows.reason?.message ?? "Failed to load report");
            if (mtdData.status === "fulfilled") setMtd(mtdData.value);
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
    return <ErrorState title="Client not found" message={clientError ?? "This client does not exist."} />;
  }

  // Derive closed vs open month
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const closedRows = reportData.filter((r) => r.metric_date < currentMonthStart);
  const openRows = reportData.filter((r) => r.metric_date >= currentMonthStart);
  const latest = closedRows.length > 0 ? closedRows[closedRows.length - 1] : null;
  const current = openRows.length > 0 ? openRows[0] : null;
  const mtdLabel = now.toLocaleDateString("en-AU", { month: "long", year: "numeric" });

  return (
    <div className="max-w-5xl mx-auto">
      <ClientHeader client={client} />

      {config ? (
        <>
          {/* ── SECTION 1: Month to date ── */}
          {(mtd || current) && (
            <>
              <SectionHeader
                title={`Month to date — ${mtd?.month_label ?? current?.month_label ?? mtdLabel}`}
                badge={mtd ? `${mtd.days_tracked} days · updated ${mtd.last_updated}` : "In progress"}
                live
              />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
                {clientId === "powershift" && mtd ? (
                  <>
                    <MetricCard label="Spend MTD" value={formatCurrency(mtd.spend_mtd)} neutral />
                    <MetricCard label="Clicks MTD" value={formatNumber(mtd.clicks_mtd)} />
                    <MetricCard label="CPC MTD" value={mtd.cpc_mtd ? formatCurrency(mtd.cpc_mtd) : "—"} invert />
                    <MetricCard label="Enquiries MTD" value={formatNumber(mtd.enquiries_mtd)} />
                    <MetricCard label="Traffic MTD" value={formatNumber(mtd.traffic_mtd)} />
                    <MetricCard label="CTR MTD" value={mtd.ctr_mtd ? formatPercentAbsolute(mtd.ctr_mtd) : "—"} />
                    <MetricCard label="Cost per enquiry" value={mtd.cost_per_enquiry_mtd ? formatCurrency(mtd.cost_per_enquiry_mtd) : "—"} invert />
                    <MetricCard label="Conv. rate MTD" value={mtd.conversion_rate_mtd ? formatPercentAbsolute(mtd.conversion_rate_mtd) : "—"} />
                  </>
                ) : current ? (
                  <>
                    <MetricCard label="Spend MTD" value={formatCurrency(current.spend)} neutral />
                    <MetricCard label="Traffic MTD" value={formatNumber(current.traffic)} />
                    <MetricCard label={`${enquiryLabel} MTD`} value={formatNumber(getEnquiries(current, isBooking))} />
                    <MetricCard label={cplLabel} value={getCPL(current, isBooking) ? formatCurrency(getCPL(current, isBooking)!) : "—"} invert />
                  </>
                ) : null}
              </div>
              <SectionDivider />
            </>
          )}

          {/* ── SECTION 2: Previous closed month ── */}
          {latest && (
            <>
              <SectionHeader title={`Previous month — ${latest.month_label}`} badge="vs month prior" />
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-2">
                <MetricCard label="Spend" value={formatCurrency(latest.spend)} delta={latest.mom_spend_pct} neutral />
                <MetricCard label="Traffic" value={formatNumber(latest.traffic)} delta={latest.mom_traffic_pct} />
                <MetricCard label={enquiryLabel} value={formatNumber(getEnquiries(latest, isBooking))} delta={getMomEnq(latest, isBooking)} />
                <MetricCard label={cplLabel} value={getCPL(latest, isBooking) ? formatCurrency(getCPL(latest, isBooking)!) : "—"} delta={getMomCPL(latest, isBooking)} invert />
                {latest.website_conversion_rate_pct !== null && latest.website_conversion_rate_pct !== undefined && (
                  <MetricCard label="Website conv. rate" value={formatPercentAbsolute(latest.website_conversion_rate_pct)} delta={latest.mom_website_conversion_rate_pct} />
                )}
              </div>
              <SectionDivider />
            </>
          )}

          {/* ── AI insights ── */}
          <InsightsList clientId={clientId} />

          {/* ── SECTION 3: 13-month charts + table ── */}
          {!reportLoading && !reportError && reportData.length > 0 && (
            <>
              <SectionHeader title="13-month performance" />
              <EnquiriesChart data={reportData} label={`${enquiryLabel} — this year vs last year`} />
              <CPLChart data={reportData} label={cplLabel} isBooking={isBooking} />
              <SpendByChannelChart clientId={clientId} />
              <SectionHeader title="Monthly breakdown" />
              <HistoryTable
                data={reportData}
                isBooking={isBooking}
                enquiryLabel={enquiryLabel}
                cplLabel={cplLabel}
              />
              <SectionDivider />
              <DrillDownTable clientId={clientId} />
            </>
          )}

          {reportLoading && <PageLoader label="Loading report data..." />}
          {reportError && <p className="text-sm text-red-500 mt-4">{reportError}</p>}
        </>
      ) : (
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
