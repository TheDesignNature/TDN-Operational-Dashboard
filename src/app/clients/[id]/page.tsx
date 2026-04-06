"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ClientHeader } from "@/components/client-detail/ClientHeader";
import { PerformanceChart } from "@/components/client-detail/PerformanceChart";
import { MonthlyTable } from "@/components/client-detail/MonthlyTable";
import { InsightsList } from "@/components/client-detail/InsightsList";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { SupabaseError } from "@/components/ui/ErrorState";
import { ErrorState } from "@/components/ui/ErrorState";
import { getClientById } from "@/services/clientsService";
import {
  getPowershiftMonthlyReport,
  getPowershiftMTD,
  type PowershiftMTD,
} from "@/services/powershiftService";
import {
  formatCurrency,
  formatNumber,
  formatPercentAbsolute,
} from "@/lib/formatters";
import type { Client, PowershiftMonthlyRow } from "@/types";

// ── Delta badge ───────────────────────────────────────────────

function Delta({
  value,
  invert = false,
  neutral = false,
}: {
  value: number | null | undefined;
  invert?: boolean;
  neutral?: boolean;
}) {
  if (value === null || value === undefined) return <span className="text-2xs text-teal/20">—</span>;
  const isPositive = value >= 0;
  const isGood = neutral ? null : invert ? !isPositive : isPositive;
  const color =
    neutral || isGood === null
      ? "text-teal/40"
      : isGood
      ? "text-emerald-600"
      : "text-red-500";
  return (
    <span className={`text-xs font-medium ${color}`}>
      {!neutral && (isPositive ? "↑" : "↓")}{Math.abs(value).toFixed(1)}%
    </span>
  );
}

// ── Section header ────────────────────────────────────────────

function SectionHeader({
  title,
  badge,
  live = false,
}: {
  title: string;
  badge?: string;
  live?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <h2 className="font-heading text-base font-semibold text-teal tracking-wide">
        {title}
      </h2>
      {live && (
        <span className="flex items-center gap-1 text-2xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
          <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse inline-block" />
          Live
        </span>
      )}
      {badge && (
        <span className="text-2xs text-teal/30 bg-sand/60 px-2 py-0.5 rounded border border-sand/40">
          {badge}
        </span>
      )}
    </div>
  );
}

// ── Metric card ───────────────────────────────────────────────

function MetricCard({
  label,
  value,
  delta,
  invert = false,
  neutral = false,
  sub,
}: {
  label: string;
  value: string;
  delta?: number | null;
  invert?: boolean;
  neutral?: boolean;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-card border border-sand/40 p-4">
      <p className="text-2xs font-medium text-teal/40 uppercase tracking-wider mb-1.5">
        {label}
      </p>
      <p className="font-heading text-2xl font-semibold text-teal leading-none mb-1.5">
        {value}
      </p>
      <div className="flex items-center gap-2">
        {delta !== undefined && (
          <Delta value={delta} invert={invert} neutral={neutral} />
        )}
        {sub && <span className="text-2xs text-teal/30">{sub}</span>}
      </div>
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────────

function SectionDivider() {
  return <div className="border-t border-sand/40 my-8" />;
}

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
    return (
      <ErrorState
        title="Client not found"
        message={clientError ?? "This client does not exist or could not be loaded."}
      />
    );
  }

  const isPowershift = clientId === "powershift";
  const latest = isPowershift && reportData.length > 0 ? reportData[reportData.length - 1] : null;

  // Current month label
  const now = new Date();
  const mtdLabel = now.toLocaleDateString("en-AU", { month: "long", year: "numeric" });

  return (
    <div className="max-w-5xl mx-auto">
      <ClientHeader client={client} />

      {isPowershift && (
        <>
          {/* ── SECTION 1: Month to Date ── */}
          {mtd && (
            <>
              <SectionHeader
                title={`Month to date — ${mtdLabel}`}
                badge={`${mtd.days_tracked} days · updated ${mtd.last_updated}`}
                live
              />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <MetricCard
                  label="Spend MTD"
                  value={formatCurrency(mtd.spend_mtd)}
                  neutral
                />
                <MetricCard
                  label="Clicks MTD"
                  value={formatNumber(mtd.clicks_mtd)}
                />
                <MetricCard
                  label="CPC MTD"
                  value={mtd.cpc_mtd ? formatCurrency(mtd.cpc_mtd) : "—"}
                  invert
                />
                <MetricCard
                  label="Enquiries MTD"
                  value={formatNumber(mtd.enquiries_mtd)}
                />
                <MetricCard
                  label="Traffic MTD"
                  value={formatNumber(mtd.traffic_mtd)}
                />
                <MetricCard
                  label="CTR MTD"
                  value={mtd.ctr_mtd ? formatPercentAbsolute(mtd.ctr_mtd) : "—"}
                />
                <MetricCard
                  label="Cost per enquiry"
                  value={mtd.cost_per_enquiry_mtd ? formatCurrency(mtd.cost_per_enquiry_mtd) : "—"}
                  invert
                />
                <MetricCard
                  label="Conv. rate MTD"
                  value={formatPercentAbsolute(mtd.conversion_rate_mtd)}
                />
              </div>
            </>
          )}

          <SectionDivider />

          {/* ── SECTION 2: Previous Month ── */}
          {latest && (
            <>
              <SectionHeader
                title={`Previous month — ${latest.month_label}`}
                badge="vs month prior"
              />
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                <MetricCard
                  label="Spend"
                  value={formatCurrency(latest.spend)}
                  delta={latest.mom_spend_pct}
                  neutral
                />
                <MetricCard
                  label="Traffic"
                  value={formatNumber(latest.traffic)}
                  delta={latest.mom_traffic_pct}
                />
                <MetricCard
                  label="Enquiries"
                  value={formatNumber(latest.enquiries)}
                  delta={latest.mom_enquiries_pct}
                />
                <MetricCard
                  label="Cost per lead"
                  value={formatCurrency(latest.cost_per_lead)}
                  delta={latest.mom_cpl_pct}
                  invert
                />
                <MetricCard
                  label="Website conv. rate"
                  value={formatPercentAbsolute(latest.website_conversion_rate_pct)}
                  delta={latest.mom_website_conversion_rate_pct}
                />
              </div>
            </>
          )}

          <SectionDivider />

          {/* ── AI insights ── */}
          <InsightsList clientId={clientId} />

          {/* ── SECTION 3: Historical chart + table ── */}
          <SectionHeader title="Performance history" />
          {reportLoading ? (
            <PageLoader label="Loading reporting data..." />
          ) : reportError ? (
            <SupabaseError
              message={reportError}
              retry={() => {
                setReportError(null);
                setReportLoading(true);
                Promise.all([getPowershiftMonthlyReport(), getPowershiftMTD()])
                  .then(([rows, mtdData]) => { setReportData(rows); setMtd(mtdData); })
                  .catch((e: unknown) => setReportError(e instanceof Error ? e.message : "Failed to reload"))
                  .finally(() => setReportLoading(false));
              }}
            />
          ) : (
            <>
              <PerformanceChart data={reportData} />
              <MonthlyTable data={reportData} />
            </>
          )}
        </>
      )}

      {/* Non-Powershift clients */}
      {!isPowershift && (
        <>
          <InsightsList clientId={clientId} />
          <div className="bg-white rounded-card border border-sand/40 border-dashed px-6 py-10 text-center mt-6">
            <p className="text-sm font-medium text-teal/40 mb-1">
              Live reporting coming soon
            </p>
            <p className="text-xs text-teal/30 max-w-xs mx-auto leading-relaxed">
              Historical data is loaded. Daily automation is being connected.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
