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
import { getClientById } from "@/services/clientsService";
import { getPowershiftMonthlyReport } from "@/services/powershiftService";
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

        // Only load real Supabase data for Powershift
        if (clientId === "powershift") {
          setReportLoading(true);
          try {
            const rows = await getPowershiftMonthlyReport();
            setReportData(rows);
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

  // ── Build summary cards ───────────────────────────────────────
  // For Powershift: use real data from the latest report row.
  // For other clients: use the summaryMetrics from the client record.

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
          invertDelta: true, // lower CPL is better
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

      {/* Summary metric cards */}
      <MetricSummaryCards metrics={summaryMetrics} />

      {/* AI insights and suggested actions */}
      <InsightsList clientId={clientId} />

      {/* Chart + table — only shown for Powershift (real data) */}
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
                getPowershiftMonthlyReport()
                  .then(setReportData)
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

      {/* Non-Powershift clients: show a placeholder reporting section */}
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
