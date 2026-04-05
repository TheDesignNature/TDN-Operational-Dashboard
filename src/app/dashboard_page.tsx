"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import { formatCurrency, formatNumber, formatPercentAbsolute } from "@/lib/formatters";

// ── Types ─────────────────────────────────────────────────────

interface ClientSummary {
  id: string;
  name: string;
  slug: string;
  spend: number | null;
  traffic: number | null;
  enquiries: number | null;
  cpl: number | null;
  mom_spend: number | null;
  mom_traffic: number | null;
  mom_enquiries: number | null;
  mom_cpl: number | null;
  month_label: string | null;
  hasData: boolean;
  isLive: boolean; // has MTD data
  mtd_spend?: number | null;
  mtd_traffic?: number | null;
  mtd_enquiries?: number | null;
}

interface ClientGroup {
  label: string | null; // null = standalone
  clients: ClientSummary[];
}

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
  if (value === null || value === undefined) return null;
  const isPositive = value >= 0;
  const isGood = neutral ? null : invert ? !isPositive : isPositive;
  const color =
    neutral || isGood === null
      ? "text-teal/40 bg-sand/60"
      : isGood
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : "text-red-600 bg-red-50 border-red-200";
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-2xs font-medium px-1.5 py-0.5 rounded border ${color}`}
    >
      {!neutral && (isPositive ? "↑" : "↓")}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

// ── Metric cell ───────────────────────────────────────────────

function Metric({
  label,
  value,
  delta,
  invert = false,
  neutral = false,
  dimmed = false,
}: {
  label: string;
  value: string;
  delta?: number | null;
  invert?: boolean;
  neutral?: boolean;
  dimmed?: boolean;
}) {
  return (
    <div className={dimmed ? "opacity-40" : ""}>
      <p className="text-2xs font-medium text-teal/40 mb-0.5 uppercase tracking-wider">
        {label}
      </p>
      <p className="font-heading text-lg font-semibold text-teal leading-none mb-1">
        {value}
      </p>
      {delta !== undefined && (
        <Delta value={delta} invert={invert} neutral={neutral} />
      )}
    </div>
  );
}

// ── Client card ───────────────────────────────────────────────

function ClientCard({ client }: { client: ClientSummary }) {
  if (!client.hasData) {
    return (
      <Link
        href={`/clients/${client.slug}`}
        className="block bg-white rounded-card border border-sand/40 border-dashed p-4 hover:border-teal/20 transition-colors"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="font-heading text-sm font-semibold text-teal">
            {client.name}
          </p>
          <span className="text-2xs text-teal/30 bg-sand/60 px-2 py-0.5 rounded-full border border-sand">
            Coming soon
          </span>
        </div>
        <p className="text-xs text-teal/30">No data connected yet</p>
      </Link>
    );
  }

  return (
    <Link
      href={`/clients/${client.slug}`}
      className="block bg-white rounded-card border border-sand/40 p-4 hover:border-teal/30 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <p className="font-heading text-sm font-semibold text-teal">
          {client.name}
        </p>
        <div className="flex items-center gap-1.5">
          {client.isLive && (
            <span className="flex items-center gap-1 text-2xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse inline-block" />
              Live
            </span>
          )}
          {client.month_label && (
            <span className="text-2xs text-teal/30">{client.month_label}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Metric
          label="Spend"
          value={client.spend !== null ? formatCurrency(client.spend) : "—"}
          delta={client.mom_spend}
          neutral
        />
        <Metric
          label="Traffic"
          value={client.traffic !== null ? formatNumber(client.traffic) : "—"}
          delta={client.mom_traffic}
        />
        <Metric
          label="Enquiries"
          value={
            client.enquiries !== null ? formatNumber(client.enquiries) : "—"
          }
          delta={client.mom_enquiries}
        />
        <Metric
          label="Cost / lead"
          value={client.cpl !== null ? formatCurrency(client.cpl) : "—"}
          delta={client.mom_cpl}
          invert
        />
      </div>
    </Link>
  );
}

// ── Group section ─────────────────────────────────────────────

function ClientGroupSection({ group }: { group: ClientGroup }) {
  return (
    <div className="mb-8">
      {group.label && (
        <h2 className="font-heading text-xs font-semibold text-teal/40 tracking-widest uppercase mb-3">
          {group.label}
        </h2>
      )}
      <div
        className={
          group.clients.length === 1
            ? "max-w-sm"
            : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        }
      >
        {group.clients.map((c) => (
          <ClientCard key={c.id} client={c} />
        ))}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────

function getLatestRow(rows: any[]): any | null {
  if (!rows?.length) return null;
  return rows.sort(
    (a, b) =>
      new Date(b.metric_date).getTime() - new Date(a.metric_date).getTime()
  )[0];
}

// ── Main page ─────────────────────────────────────────────────

export default function DashboardPage() {
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated] = useState(
    new Date().toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
  );

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseClient();

      // Fetch all monthly report views in parallel
      const [ps, kkcs, fhm, sh, cc, cm, sac] = await Promise.allSettled([
        supabase.from("powershift_monthly_report").select("*").order("metric_date"),
        supabase.from("kkcs_monthly_report").select("*").order("metric_date"),
        supabase.from("fhm_monthly_report").select("*").order("metric_date"),
        supabase.from("studyhub_monthly_report").select("*").order("metric_date"),
        supabase.from("cal_city_monthly_report").select("*").order("metric_date"),
        supabase.from("cal_mazda_monthly_report").select("*").order("metric_date"),
        supabase.from("sac_monthly_report").select("*").order("metric_date"),
      ]);

      function buildClient(
        id: string,
        name: string,
        slug: string,
        result: PromiseSettledResult<any>
      ): ClientSummary {
        if (result.status === "rejected" || !result.value?.data?.length) {
          return { id, name, slug, spend: null, traffic: null, enquiries: null, cpl: null, mom_spend: null, mom_traffic: null, mom_enquiries: null, mom_cpl: null, month_label: null, hasData: false, isLive: false };
        }
        const rows = result.value.data;
        const latest = getLatestRow(rows);
        const prev = rows.length >= 2 ? rows[rows.length - 2] : null;

        // enquiries field name varies by client
        const enq = latest.enquiries ?? latest.bookings ?? null;
        const prevEnq = prev ? (prev.enquiries ?? prev.bookings ?? null) : null;

        return {
          id,
          name,
          slug,
          spend: latest.spend,
          traffic: latest.traffic,
          enquiries: enq,
          cpl: latest.cost_per_lead ?? latest.cost_per_booking ?? null,
          mom_spend: latest.mom_spend_pct,
          mom_traffic: latest.mom_traffic_pct,
          mom_enquiries: latest.mom_enquiries_pct ?? latest.mom_bookings_pct ?? null,
          mom_cpl: latest.mom_cpl_pct ?? latest.mom_cpb_pct ?? null,
          month_label: latest.month_label,
          hasData: true,
          isLive: false, // updated below for Powershift
        };
      }

      const psClient = buildClient("powershift", "Powershift", "powershift", ps);
      // Check if Powershift has live MTD data
      const { data: mtdData } = await supabase.from("powershift_mtd").select("spend_mtd,traffic_mtd,enquiries_mtd").single().throwOnError().catch(() => ({ data: null }));
      if (mtdData?.spend_mtd) {
        psClient.isLive = true;
        psClient.mtd_spend = mtdData.spend_mtd;
        psClient.mtd_traffic = mtdData.traffic_mtd;
        psClient.mtd_enquiries = mtdData.enquiries_mtd;
      }

      const built: ClientGroup[] = [
        {
          label: null,
          clients: [psClient],
        },
        {
          label: "KKCS Group",
          clients: [
            buildClient("kkcs", "KKCS", "kkcs", kkcs),
            buildClient("fhm", "Foundation Home Mods", "foundation-home-mods", fhm),
            buildClient("studyhub", "Study Hub", "study-hub", sh),
          ],
        },
        {
          label: "Automotive",
          clients: [
            buildClient("calcity", "Caloundra City Auto", "caloundra-city-auto", cc),
            buildClient("calmazda", "Caloundra Mazda", "caloundra-mazda", cm),
            buildClient("sac", "Sell a Car", "sell-a-car", sac),
          ],
        },
      ];

      setGroups(built);
      setLoading(false);
    }

    load();
  }, []);

  // Current month label
  const now = new Date();
  const mtdLabel = now.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
  const priorLabel = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString("en-AU", { month: "long", year: "numeric" });

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto pt-12 text-center">
        <p className="text-sm text-teal/40">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-teal tracking-wide">
            Dashboard
          </h1>
          <p className="text-xs text-teal/40 mt-0.5">
            Updated {lastUpdated}
          </p>
        </div>
      </div>

      {/* Prior month performance */}
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-heading text-sm font-semibold text-teal tracking-wide">
            {priorLabel}
          </h2>
          <span className="text-2xs text-teal/30 bg-sand/60 px-2 py-0.5 rounded border border-sand/40">
            Prior month · MoM vs {new Date(now.getFullYear(), now.getMonth() - 2, 1).toLocaleDateString("en-AU", { month: "short", year: "numeric" })}
          </span>
        </div>
        {groups.map((group, i) => (
          <ClientGroupSection key={i} group={group} />
        ))}
      </div>
    </div>
  );
}
