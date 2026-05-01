"use client";

import { useEffect, useState, useMemo } from "react";
import { getSourceData, getAvailableMonths, type SourceDataRow } from "@/services/drillDownService";
import { formatCurrency, formatNumber, formatPercentAbsolute } from "@/lib/formatters";

// ── Helpers ──────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  google_ads:   "Google Ads",
  meta_ads:     "Meta",
  linkedin_ads: "LinkedIn",
  ga4:          "GA4",
  manual:       "Manual",
};

const SOURCE_COLORS: Record<string, string> = {
  google_ads:   "bg-blue-50 text-blue-700 border-blue-200",
  meta_ads:     "bg-indigo-50 text-indigo-700 border-indigo-200",
  linkedin_ads: "bg-sky-50 text-sky-700 border-sky-200",
  ga4:          "bg-emerald-50 text-emerald-700 border-emerald-200",
  manual:       "bg-stone-100 text-stone-600 border-stone-200",
};

function SourceBadge({ source }: { source: string }) {
  const label = SOURCE_LABELS[source] ?? source;
  const color = SOURCE_COLORS[source] ?? "bg-sand/40 text-teal/60 border-sand";
  return (
    <span className={`text-2xs font-medium px-1.5 py-0.5 rounded border ${color}`}>
      {label}
    </span>
  );
}

function NA() {
  return <span className="text-teal/20">—</span>;
}

function Cell({ val, fmt = "number" }: { val: number | null; fmt?: "currency" | "number" | "percent" }) {
  if (val === null || val === undefined) return <NA />;
  if (fmt === "currency") return <>{formatCurrency(val)}</>;
  if (fmt === "percent") return <>{formatPercentAbsolute(val)}</>;
  return <>{formatNumber(val)}</>;
}

// ── Column groups ─────────────────────────────────────────────

type ColGroup = "paid" | "ga4";

const PAID_COLS = [
  { key: "impressions",   label: "Impr.",    fmt: "number"   },
  { key: "clicks",        label: "Clicks",   fmt: "number"   },
  { key: "spend",         label: "Spend",    fmt: "currency" },
  { key: "ctr_pct",       label: "CTR%",     fmt: "percent"  },
  { key: "cpc",           label: "CPC",      fmt: "currency" },
  { key: "conversions",   label: "Conv.",    fmt: "number"   },
  { key: "cost_per_conv", label: "CPA",      fmt: "currency" },
] as const;

const GA4_COLS = [
  { key: "traffic",           label: "Traffic",    fmt: "number" },
  { key: "form_submissions",  label: "Forms",      fmt: "number" },
  { key: "website_calls",     label: "Calls",      fmt: "number" },
  { key: "website_chat",      label: "Chat",       fmt: "number" },
  { key: "email_link_clicks", label: "Email",      fmt: "number" },
  { key: "booking_completes", label: "Bookings",   fmt: "number" },
  { key: "registrations",     label: "Regs",       fmt: "number" },
  { key: "total_enquiries",   label: "Enquiries",  fmt: "number" },
  { key: "cost_per_lead",     label: "CPL",        fmt: "currency" },
  { key: "wcr_pct",           label: "WCR%",       fmt: "percent" },
] as const;

// ── Main component ────────────────────────────────────────────

interface Props {
  clientId: string;
}

export function DrillDownTable({ clientId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<SourceDataRow[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [activeGroup, setActiveGroup] = useState<ColGroup>("paid");

  // Load on first open
  useEffect(() => {
    if (!open || rows.length > 0) return;
    setLoading(true);
    setError(null);
    getSourceData(clientId)
      .then((data) => {
        setRows(data);
        const months = getAvailableMonths(data);
        if (months.length > 0) setSelectedMonth(months[0]);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, clientId, rows.length]);

  const months = useMemo(() => getAvailableMonths(rows), [rows]);

  const filtered = useMemo(
    () => rows.filter((r) => !selectedMonth || r.month_date === selectedMonth),
    [rows, selectedMonth]
  );

  // Group by data_source for display
  const grouped = useMemo(() => {
    const map = new Map<string, SourceDataRow[]>();
    for (const row of filtered) {
      const key = row.data_source;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return map;
  }, [filtered]);

  const cols = activeGroup === "paid" ? PAID_COLS : GA4_COLS;
  const isPaidGroup = activeGroup === "paid";

  return (
    <div className="mb-6">
      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs font-medium text-teal/50 hover:text-teal transition-colors group"
      >
        <span
          className={`w-4 h-4 rounded border border-sand/60 flex items-center justify-center transition-transform ${open ? "rotate-90" : ""}`}
        >
          <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
            <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span>Data source drill-down</span>
        <span className="text-2xs text-teal/30 bg-sand/40 px-1.5 py-0.5 rounded border border-sand/30">
          QA
        </span>
      </button>

      {open && (
        <div className="mt-4 bg-white rounded-card border border-sand/40 overflow-hidden">
          {/* Controls */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-sand/30 bg-stone/30">
            <div className="flex items-center gap-2">
              {/* Month selector */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs text-teal border border-sand/50 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-teal/30"
              >
                <option value="">All months</option>
                {months.map((m) => (
                  <option key={m} value={m}>
                    {new Date(m + "T00:00:00").toLocaleDateString("en-AU", { month: "long", year: "numeric" })}
                  </option>
                ))}
              </select>
            </div>

            {/* Column group toggle */}
            <div className="flex items-center bg-stone/60 rounded p-0.5 border border-sand/30">
              {(["paid", "ga4"] as ColGroup[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setActiveGroup(g)}
                  className={`text-2xs font-medium px-2.5 py-1 rounded transition-colors ${
                    activeGroup === g
                      ? "bg-white text-teal shadow-sm border border-sand/40"
                      : "text-teal/40 hover:text-teal/60"
                  }`}
                >
                  {g === "paid" ? "Paid channels" : "Website (GA4)"}
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="px-4 py-8 text-center text-xs text-teal/40">Loading source data…</div>
          )}
          {error && (
            <div className="px-4 py-4 text-xs text-red-500">{error}</div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-sand/30 bg-stone/20">
                    <th className="text-left px-3 py-2.5 font-medium text-teal/40 uppercase tracking-wider text-2xs whitespace-nowrap sticky left-0 bg-stone/20 min-w-[180px]">
                      Campaign
                    </th>
                    <th className="text-left px-3 py-2.5 font-medium text-teal/40 uppercase tracking-wider text-2xs whitespace-nowrap">
                      Source
                    </th>
                    {cols.map((c) => (
                      <th key={c.key} className="text-right px-3 py-2.5 font-medium text-teal/40 uppercase tracking-wider text-2xs whitespace-nowrap">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from(grouped.entries()).map(([source, sourceRows]) => {
                    // Skip GA4 rows when viewing paid cols and vice versa
                    const isGA4Source = source === "ga4";
                    if (isPaidGroup && isGA4Source) return null;
                    if (!isPaidGroup && !isGA4Source) return null;

                    return sourceRows.map((row, i) => (
                      <tr
                        key={`${source}-${i}`}
                        className="border-b border-sand/20 hover:bg-stone/20 transition-colors"
                      >
                        <td className="px-3 py-2 text-teal/80 sticky left-0 bg-white max-w-[240px] truncate">
                          {row.campaign_name ?? <span className="text-teal/30 italic">All campaigns</span>}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <SourceBadge source={row.data_source} />
                        </td>
                        {cols.map((c) => (
                          <td key={c.key} className="px-3 py-2 text-right text-teal/70 whitespace-nowrap tabular-nums">
                            <Cell val={(row as any)[c.key]} fmt={c.fmt as any} />
                          </td>
                        ))}
                      </tr>
                    ));
                  })}
                </tbody>

                {/* Source subtotals */}
                {Array.from(grouped.entries()).map(([source, sourceRows]) => {
                  const isGA4Source = source === "ga4";
                  if (isPaidGroup && isGA4Source) return null;
                  if (!isPaidGroup && !isGA4Source) return null;
                  if (sourceRows.length < 2) return null;

                  const totals = cols.reduce((acc, c) => {
                    const vals = sourceRows.map((r) => (r as any)[c.key] as number | null).filter((v) => v !== null) as number[];
                    acc[c.key] = vals.length ? vals.reduce((a, b) => a + b, 0) : null;
                    return acc;
                  }, {} as Record<string, number | null>);

                  return (
                    <tr key={`total-${source}`} className="bg-stone/40 border-b border-sand/40">
                      <td className="px-3 py-2 font-semibold text-teal/60 sticky left-0 bg-stone/40 text-2xs uppercase tracking-wide">
                        {SOURCE_LABELS[source] ?? source} total
                      </td>
                      <td className="px-3 py-2" />
                      {cols.map((c) => (
                        <td key={c.key} className="px-3 py-2 text-right font-semibold text-teal/70 whitespace-nowrap tabular-nums">
                          <Cell val={totals[c.key]} fmt={c.fmt as any} />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </table>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-teal/30">
              No source data available for this period.
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-sand/20 bg-stone/20 flex items-center justify-between">
            <p className="text-2xs text-teal/30">
              Source: <code className="font-mono">source_data_by_campaign</code> view
            </p>
            <p className="text-2xs text-teal/30">
              {filtered.length} rows · {grouped.size} sources
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
