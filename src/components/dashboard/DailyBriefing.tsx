"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { getDailySummary } from "@/services/openClawService";
import { getAllClients } from "@/services/clientsService";
import { formatDueDate } from "@/lib/formatters";
import type { DailySummary, Client, Alert } from "@/types";

export function DailyBriefing() {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [s, c] = await Promise.all([getDailySummary(), getAllClients()]);
      setSummary(s);
      setClients(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load briefing");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <Card padding="lg" className="mb-6">
        <LoadingSpinner label="Preparing your briefing..." />
      </Card>
    );
  }

  if (error || !summary) {
    return (
      <Card padding="lg" className="mb-6">
        <ErrorState message={error ?? "No summary available"} retry={load} size="sm" />
      </Card>
    );
  }

  const priorityClients = clients.filter((c) =>
    summary.priorityClientIds.includes(c.id)
  );

  return (
    <Card padding="none" className="mb-6 overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-teal/5 border-b border-sand/40">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
          <span className="text-xs font-semibold text-teal/60 tracking-wider uppercase">
            Today's briefing
          </span>
        </div>
        <span className="text-2xs text-teal/30">
          AI-generated · mock data
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-sand/40">
        {/* Summary text */}
        <div className="lg:col-span-2 p-5">
          <p className="text-sm text-teal/80 leading-relaxed">{summary.summaryText}</p>

          {priorityClients.length > 0 && (
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <span className="text-xs text-teal/40 mr-1">Needs attention:</span>
              {priorityClients.map((c) => (
                <a
                  key={c.id}
                  href={`/clients/${c.id}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-status-action-bg text-status-action
                             border border-status-action-border rounded-full text-xs font-medium
                             hover:bg-status-action-border transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-status-action" />
                  {c.name}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Top alerts */}
        <div className="p-5">
          <p className="section-label mb-3">Top alerts</p>
          {summary.topAlerts.length === 0 ? (
            <p className="text-sm text-teal/35 italic">No active alerts</p>
          ) : (
            <div className="space-y-2.5">
              {summary.topAlerts.slice(0, 3).map((alert) => (
                <AlertRow key={alert.id} alert={alert} clients={clients} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function AlertRow({ alert, clients }: { alert: Alert; clients: Client[] }) {
  const client = clients.find((c) => c.id === alert.clientId);
  const isNegative = alert.deltaPercent < 0;

  return (
    <div className="flex items-start gap-2.5">
      <span
        className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          alert.severity === "critical" ? "bg-status-action" : "bg-status-watch"
        }`}
      />
      <div className="min-w-0">
        <p className="text-xs text-teal/70 leading-snug">{alert.message}</p>
        <div className="flex items-center gap-2 mt-1">
          {client && (
            <span className="text-2xs text-teal/35 font-medium">{client.name}</span>
          )}
          <span
            className={`text-2xs font-semibold tabular-nums ${
              isNegative ? "text-status-action" : "text-status-watch"
            }`}
          >
            {alert.deltaPercent > 0 ? "+" : ""}
            {alert.deltaPercent}%
          </span>
        </div>
      </div>
    </div>
  );
}
