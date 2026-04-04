"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ClientHeader } from "@/components/client-detail/ClientHeader";
import { MetricSummaryCards } from "@/components/client-detail/MetricSummaryCards";
import { PerformanceChart } from "@/components/client-detail/PerformanceChart";
import { MonthlyTable } from "@/components/client-detail/MonthlyTable";
import { InsightsList } from "@/components/client-detail/InsightsList";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { SupabaseError } from "@/components/ui/ErrorState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Card } from "@/components/ui/Card";
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
import type { Client, PowershiftMonthlyRow, SummaryMetric } from "@/types";

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
        if (!c) {
          setClientError("Client not found.");
          return;
        }
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
            setReportError(
              e instanceof Error ? e.message : "Failed to load report data"
            );
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
  const latest =
    isPowershift && reportData.length > 0
      ? reportData[reportData.length - 1]
      : null;

  const summaryMetrics = latest
    ? [
        {
          label: "Spend",
          value: formatCurrency(latest.spend),
          delta: latest.mom_spend_pct,
        },
        {
          label: "Traffic",
          value: formatNumber(latest.traffic),
          delta: latest.mom_traffic_pct,
        },
        {
          label: "Enquiries",
          value: formatNumber(latest.enquiries),
          delta: latest.mom_enquiries_pct,
        },
        {
          label: "Cost per lead",
          value: formatCurrency(latest.cost_per_lead),
          delta: latest.mom_cpl_pct,
          invertDelta: true,
        },
        {
          label: "Website conv. rate",
          value: formatPercentAbsolute(latest.website_conversion_rate_pct),
          delta: latest.mom_website_conversion_rate_pct,
        },
      ]
    : client.summaryMetrics.map((m: SummaryMetric) => ({
        label: m.label,
        value: m.value,
        delta: m.delta,
      }));

  return (
    <div className="max-w-5xl mx-auto">
      <ClientHeader client={client} />

      {/* Last full month summary cards */}
      <MetricSummaryCards metrics={summaryMetrics} />

      {/* Month to date panel — Powershift only */}
      {isPowershift && mtd && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-heading text-sm font-semibold text-teal tracking-wide">
              Month to date — {mtd.month_label}
            </h2>
            <span className="text-2xs text-teal/30 bg-sand-pale px-2 py-0.5 rounded border border-sand/40">
              {mtd.days_tracked} days tracked · updated {mtd.last_updated}
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card padding="md">
              <p className="text-xs font-medium text-teal/40 mb-1.5">Spend MTD</p>
              <p className="font-heading text-2xl font-semibold text-teal">
                {formatCurrency(mtd.spend_mtd)}
              </p>
            </Card>
            <Card padding="md">
              <p className="text-xs font-medium text-teal/40 mb-1.5">Clicks MTD</p>
              <p className="font-heading text-2xl font-semibold text-teal">
                {formatNumber(mtd.clicks_mtd)}
              </p>
            </Card>
            <Card padding="md">
              <p className="text-xs font-medium text-teal/40 mb-1.5">CPC MTD</p>
              <p className="font-heading text-2xl font-semibold text-teal">
                {mtd.cpc_mtd ? formatCurrency(mtd.cpc_mtd) : "—"}
              </p>
            </Card>
            <Card padding="md">
              <p className="text-xs font-medium text-teal/40 mb-1.5">Enquiries MTD</p>
              <p className="font-heading text-2xl font-semibold text-teal">
                {formatNumber(mtd.enquiries_mtd)}
              </p>
            </Card>
            <Card padding="md">
              <p className="text-xs font-medium text-teal/40 mb-1.5">Traffic MTD</p>
              <p className="font-heading text-2xl font-semibold text-teal">
                {formatNumber(mtd.traffic_mtd)}
              </p>
            </Card>
            <Card padding="md">
              <p className="text-xs font-medium text-teal/40 mb-1.5">CTR MTD</p>
              <p className="font-heading text-2xl font-semibold text-teal">
                {mtd.ctr_mtd ? formatPercentAbsolute(mtd.ctr_mtd) : "—"}
              </p>
            </Card>
            <Card padding="md">
              <p className="text-xs font-medium text-teal/40 mb-1.5">Cost per enquiry</p>
              <p className="font-heading text-2xl font-semibold text-teal">
                {mtd.cost_per_enquiry_mtd ? formatCurrency(mtd.cost_per_enquiry_mtd) : "—"}
              </p>
            </Card>
            <Card padding="md">
              <p className="text-xs font-medium text-teal/40 mb-1.5">Conv. rate MTD</p>
              <p className="font-heading text-2xl font-semibold text-teal">
                {formatPercentAbsolute(mtd.conversion_rate_mtd)}
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* AI insights and suggested actions */}
      <InsightsList clientId={clientId} />

      {/* Chart + table — Powershift only */}
      {isPowershift && (
        <>
          {reportLoading ? (
            <PageLoader label="Loading reporting data..." />
          ) : reportError ? (
            <SupabaseError
              message={reportError}
              retry={() => {
                setReportError(null);
                setReportLoading(true);
                Promise.all([
                  getPowershiftMonthlyReport(),
                  getPowershiftMTD(),
                ])
                  .then(([rows, mtdData]) => {
                    setReportData(rows);
                    setMtd(mtdData);
                  })
                  .catch((e: unknown) =>
                    setReportError(
                      e instanceof Error ? e.message : "Failed to reload"
                    )
                  )
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

      {/* Non-Powershift clients: placeholder */}
      {!isPowershift && (
        <div className="bg-white rounded-card border border-sand/40 border-dashed px-6 py-10 text-center">
          <p className="text-sm font-medium text-teal/40 mb-1">
            Detailed reporting not yet connected
          </p>
          <p className="text-xs text-teal/30 max-w-xs mx-auto leading-relaxed">
            This client uses mock summary data. Connect a Supabase reporting view
            for this client to enable the chart and monthly table.
          </p>
        </div>
      )}
    </div>
  );
}

