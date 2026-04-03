"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getAllClients } from "@/services/clientsService";
import { getDailySummary } from "@/services/openClawService";
import type { DailySummary, Client } from "@/types";

export function DailySummaryCard() {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDailySummary(), getAllClients()]).then(([s, c]) => {
      setSummary(s);
      setClients(c);
      setLoading(false);
    });
  }, []);

  const time = new Date().toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card padding="none" className="mb-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-sand/40 bg-teal/5">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-teal/50">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-xs font-semibold text-teal/60 tracking-wider uppercase">
            Daily summary
          </span>
        </div>
        <span className="text-2xs text-teal/30">Generated at {time} · mock AI</span>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="py-6 flex justify-center">
            <LoadingSpinner size="sm" label="Generating summary..." />
          </div>
        ) : summary ? (
          <>
            <p className="text-sm text-teal/80 leading-relaxed mb-4">
              {summary.summaryText}
            </p>

            {/* Priority clients */}
            {summary.priorityClientIds.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-teal/40 font-medium">
                  Priority today:
                </span>
                {summary.priorityClientIds.map((id) => {
                  const client = clients.find((c) => c.id === id);
                  if (!client) return null;
                  return (
                    <a
                      key={id}
                      href={`/clients/${id}`}
                      className="text-xs px-2.5 py-1 rounded-full bg-status-action-bg text-status-action
                                 border border-status-action-border font-medium hover:opacity-80 transition-opacity"
                    >
                      {client.name}
                    </a>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-teal/40 text-center py-4 italic">
            No summary available.
          </p>
        )}
      </div>
    </Card>
  );
}
