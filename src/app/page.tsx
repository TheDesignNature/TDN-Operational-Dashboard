"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import { formatCurrency, formatNumber } from "@/lib/formatters";

interface ClientSummary {
  id: string;
  name: string;
  slug: string;
  // Latest closed month
  latestMonth: string | null;
  spend: number | null;
  traffic: number | null;
  enquiries: number | null;
  cpl: number | null;
  mom_spend: number | null;
  mom_traffic: number | null;
  mom_enquiries: number | null;
  mom_cpl: number | null;
  // Current open month (MTD)
  currentMonth: string | null;
  mtd_spend: number | null;
  mtd_traffic: number | null;
  mtd_enquiries: number | null;
  hasData: boolean;
  isLive: boolean;
}

interface ClientGroup {
  label: string | null;
  clients: ClientSummary[];
}

function Delta({ value, invert = false, neutral = false }: {
  value: number | null | undefined;
  invert?: boolean;
  neutral?: boolean;
}) {
  if (value === null || value === undefined) return null;
  const isPositive = value >= 0;
  const isGood = neutral ? null : invert ? !isPositive : isPositive;
  const color = neutral || isGood === null
    ? "text-teal/40 bg-sand/60 border-sand"
    : isGood
    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : "text-red-600 bg-red-50 border-red-200";
  return (
    <span className={`inline-flex items-center gap-0.5 text-2xs font-medium px-1.5 py-0.5 rounded border ${color}`}>
      {!neutral && (isPositive ? "↑" : "↓")}{Math.abs(value).toFixed(1)}%
    </span>
  );
}

function ClientCard({ client }: { client: ClientSummary }) {
  if (!client.hasData) {
    return (
      <Link href={`/clients/${client.slug}`}
        className="block bg-white rounded-card border border-sand/40 border-dashed p-4 hover:border-teal/20 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <p className="font-heading text-sm font-semibold text-teal">{client.name}</p>
          <span className="text-2xs text-teal/30 bg-sand/60 px-2 py-0.5 rounded-full border border-sand">Coming soon</span>
        </div>
        <p className="text-xs text-teal/30">No data connected yet</p>
      </Link>
    );
  }

  return (
    <Link href={`/clients/${client.slug}`}
      className="block bg-white rounded-card border border-sand/40 p-4 hover:border-teal/30 hover:shadow-sm transition-all">

      {/* Card header */}
      <div className="flex items-center justify-between mb-4">
        <p className="font-heading text-sm font-semibold text-teal">{client.name}</p>
        <div className="flex items-center gap-1.5">
          {client.isLive && (
            <span className="flex items-center gap-1 text-2xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse inline-block" />
              Live
            </span>
          )}
        </div>
      </div>

      {/* MTD row — only if live and has current month data */}
      {client.isLive && client.currentMonth && client.mtd_spend !== null && (
        <div className="mb-3 pb-3 border-b border-sand/40">
          <p className="text-2xs font-medium text-teal/40 uppercase tracking-wider mb-2">
            {client.currentMonth} — MTD
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-2xs text-teal/30 mb-0.5">Spend</p>
              <p className="font-heading text-sm font-semibold text-teal">{formatCurrency(client.mtd_spend)}</p>
            </div>
            <div>
              <p className="text-2xs text-teal/30 mb-0.5">Traffic</p>
              <p className="font-heading text-sm font-semibold text-teal">{formatNumber(client.mtd_traffic ?? 0)}</p>
            </div>
            <div>
              <p className="text-2xs text-teal/30 mb-0.5">Enquiries</p>
              <p className="font-heading text-sm font-semibold text-teal">{formatNumber(client.mtd_enquiries ?? 0)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Prior closed month */}
      {client.latestMonth && (
        <>
          <p className="text-2xs font-medium text-teal/40 uppercase tracking-wider mb-2">
            {client.latestMonth} — Prior month
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            <div>
              <p className="text-2xs text-teal/30 mb-0.5">Spend</p>
              <div className="flex items-center gap-1.5">
                <p className="font-heading text-sm font-semibold text-teal">{client.spend !== null ? formatCurrency(client.spend) : "—"}</p>
                <Delta value={client.mom_spend} neutral />
              </div>
            </div>
            <div>
              <p className="text-2xs text-teal/30 mb-0.5">Traffic</p>
              <div className="flex items-center gap-1.5">
                <p className="font-heading text-sm font-semibold text-teal">{client.traffic !== null ? formatNumber(client.traffic) : "—"}</p>
                <Delta value={client.mom_traffic} />
              </div>
            </div>
            <div>
              <p className="text-2xs text-teal/30 mb-0.5">Enquiries</p>
              <div className="flex items-center gap-1.5">
                <p className="font-heading text-sm font-semibold text-teal">{client.enquiries !== null ? formatNumber(client.enquiries) : "—"}</p>
                <Delta value={client.mom_enquiries} />
              </div>
            </div>
            <div>
              <p className="text-2xs text-teal/30 mb-0.5">CPL</p>
              <div className="flex items-center gap-1.5">
                <p className="font-heading text-sm font-semibold text-teal">{client.cpl !== null ? formatCurrency(client.cpl) : "—"}</p>
                <Delta value={client.mom_cpl} invert />
              </div>
            </div>
          </div>
        </>
      )}
    </Link>
  );
}

function ClientGroupSection({ group }: { group: ClientGroup }) {
  return (
    <div className="mb-8">
      {group.label && (
        <h2 className="font-heading text-xs font-semibold text-teal/40 tracking-widest uppercase mb-3">
          {group.label}
        </h2>
      )}
      <div className={group.clients.length === 1 ? "max-w-sm" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"}>
        {group.clients.map((c) => <ClientCard key={c.id} client={c} />)}
      </div>
    </div>
  );
}

function buildClient(
  id: string, name: string, slug: string,
  result: PromiseSettledResult<any>,
  mtdResult?: PromiseSettledResult<any>
): ClientSummary {
  const empty: ClientSummary = {
    id, name, slug,
    latestMonth: null, spend: null, traffic: null, enquiries: null, cpl: null,
    mom_spend: null, mom_traffic: null, mom_enquiries: null, mom_cpl: null,
    currentMonth: null, mtd_spend: null, mtd_traffic: null, mtd_enquiries: null,
    hasData: false, isLive: false,
  };

  if (result.status === "rejected" || !result.value?.data?.length) return empty;

  const rows = result.value.data as any[];

  // Latest CLOSED month = last row where metric_date < start of current month
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const closedRows = rows.filter((r: any) => r.metric_date < currentMonthStart);
  const openRows = rows.filter((r: any) => r.metric_date >= currentMonthStart);

  const latest = closedRows.length > 0 ? closedRows[closedRows.length - 1] : rows[rows.length - 1];
  const current = openRows.length > 0 ? openRows[openRows.length - 1] : null;

  const enq = latest.enquiries ?? latest.bookings ?? null;

  const client: ClientSummary = {
    id, name, slug,
    latestMonth: latest.month_label,
    spend: latest.spend,
    traffic: latest.traffic,
    enquiries: enq,
    cpl: latest.cost_per_lead ?? latest.cost_per_booking ?? null,
    mom_spend: latest.mom_spend_pct,
    mom_traffic: latest.mom_traffic_pct,
    mom_enquiries: latest.mom_enquiries_pct ?? latest.mom_bookings_pct ?? null,
    mom_cpl: latest.mom_cpl_pct ?? latest.mom_cpb_pct ?? null,
    currentMonth: current?.month_label ?? null,
    mtd_spend: current?.spend ?? null,
    mtd_traffic: current?.traffic ?? null,
    mtd_enquiries: current?.enquiries ?? current?.bookings ?? null,
    hasData: true,
    isLive: false,
  };

  // Check MTD view for Powershift
  if (mtdResult?.status === "fulfilled" && mtdResult.value?.data) {
    const mtd = mtdResult.value.data;
    if (mtd.spend_mtd) {
      client.isLive = true;
      client.currentMonth = mtd.month_label;
      client.mtd_spend = mtd.spend_mtd;
      client.mtd_traffic = mtd.traffic_mtd;
      client.mtd_enquiries = mtd.enquiries_mtd;
    }
  } else if (current) {
    client.isLive = true;
  }

  return client;
}

export default function DashboardPage() {
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated] = useState(new Date().toLocaleDateString("en-AU", {
    weekday: "short", day: "numeric", month: "short",
  }));

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseClient();
      const [ps, psMtd, kkcs, fhm, sh, cc, cm, sac] = await Promise.allSettled([
        supabase.from("powershift_monthly_report").select("*").order("metric_date"),
        supabase.from("powershift_mtd").select("*").single(),
        supabase.from("kkcs_monthly_report").select("*").order("metric_date"),
        supabase.from("fhm_monthly_report").select("*").order("metric_date"),
        supabase.from("studyhub_monthly_report").select("*").order("metric_date"),
        supabase.from("cal_city_monthly_report").select("*").order("metric_date"),
        supabase.from("cal_mazda_monthly_report").select("*").order("metric_date"),
        supabase.from("sac_monthly_report").select("*").order("metric_date"),
      ]);

      setGroups([
        {
          label: null,
          clients: [buildClient("powershift", "Powershift", "powershift", ps, psMtd)],
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
      ]);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto pt-12 text-center">
        <p className="text-sm text-teal/40">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-teal tracking-wide">Dashboard</h1>
          <p className="text-xs text-teal/40 mt-0.5">Updated {lastUpdated}</p>
        </div>
      </div>
      {groups.map((group, i) => <ClientGroupSection key={i} group={group} />)}
    </div>
  );
}
