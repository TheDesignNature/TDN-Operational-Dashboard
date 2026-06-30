"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

interface ClosedMonth {
  month_label: string;
  spend: number;
  traffic: number;
  enquiries: number;
  cpl: number | null;
  mom_spend: number | null;
  mom_traffic: number | null;
  mom_enquiries: number | null;
  mom_cpl: number | null;
}

interface MtdSnapshot {
  month_label: string;
  spend_mtd: number;
  traffic_mtd: number;
  enquiries_mtd: number;
}

function buildClient(
  id: string, name: string, slug: string,
  closed: ClosedMonth | null,
  mtd: MtdSnapshot | null
): ClientSummary {
  const empty: ClientSummary = {
    id, name, slug,
    latestMonth: null, spend: null, traffic: null, enquiries: null, cpl: null,
    mom_spend: null, mom_traffic: null, mom_enquiries: null, mom_cpl: null,
    currentMonth: null, mtd_spend: null, mtd_traffic: null, mtd_enquiries: null,
    hasData: false, isLive: false,
  };

  if (!closed) return empty;

  return {
    id, name, slug,
    latestMonth: closed.month_label,
    spend: closed.spend,
    traffic: closed.traffic,
    enquiries: closed.enquiries,
    cpl: closed.cpl,
    mom_spend: closed.mom_spend,
    mom_traffic: closed.mom_traffic,
    mom_enquiries: closed.mom_enquiries,
    mom_cpl: closed.mom_cpl,
    currentMonth: mtd?.month_label ?? null,
    mtd_spend: mtd?.spend_mtd ?? null,
    mtd_traffic: mtd?.traffic_mtd ?? null,
    mtd_enquiries: mtd?.enquiries_mtd ?? null,
    hasData: true,
    isLive: true,
  };
}

export default function DashboardPage() {
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated] = useState(new Date().toLocaleDateString("en-AU", {
    weekday: "short", day: "numeric", month: "short",
  }));

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/dashboard/home");
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Failed to load dashboard (${res.status})`);
        }
        const body = await res.json();
        const bySlug = new Map<string, { closed: ClosedMonth | null; mtd: MtdSnapshot | null }>(
          (body.clients ?? []).map((c: any) => [c.slug, { closed: c.closed, mtd: c.mtd }])
        );
        const get = (slug: string) => bySlug.get(slug) ?? { closed: null, mtd: null };

        setGroups([
          {
            label: null,
            clients: [buildClient("powershift", "Powershift", "powershift", get("powershift").closed, get("powershift").mtd)],
          },
          {
            label: "KKCS Group",
            clients: [
              buildClient("kkcs", "KKCS", "kkcs", get("kkcs").closed, get("kkcs").mtd),
              buildClient("fhm", "Foundation Home Mods", "foundation-home", get("foundation-home").closed, get("foundation-home").mtd),
              buildClient("studyhub", "Study Hub", "study-hub", get("study-hub").closed, get("study-hub").mtd),
            ],
          },
          {
            label: "Automotive",
            clients: [
              buildClient("calcity", "Caloundra City Auto", "caloundra-city-auto", get("caloundra-city-auto").closed, get("caloundra-city-auto").mtd),
              buildClient("calmazda", "Caloundra Mazda", "caloundra-mazda", get("caloundra-mazda").closed, get("caloundra-mazda").mtd),
              buildClient("sac", "Sell a Car", "sell-a-car", get("sell-a-car").closed, get("sell-a-car").mtd),
            ],
          },
        ]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
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

  if (error) {
    return (
      <div className="max-w-5xl mx-auto pt-12 text-center">
        <p className="text-sm text-red-600">Couldn&apos;t load the dashboard: {error}</p>
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
