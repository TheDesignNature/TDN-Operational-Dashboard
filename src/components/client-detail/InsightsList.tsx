"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getSeverityClass } from "@/lib/statusHelpers";
import { formatRelativeDate } from "@/lib/formatters";
import { getClientInsightsAndActions } from "@/services/openClawService";
import type { Insight } from "@/types";

interface InsightsListProps {
  clientId: string;
}

export function InsightsList({ clientId }: InsightsListProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClientInsightsAndActions(clientId).then(({ insights, suggestedActions }) => {
      setInsights(insights);
      setSuggestedActions(suggestedActions);
      setLoading(false);
    });
  }, [clientId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <Card padding="none" className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-sand/40">
          <h3 className="font-heading text-sm font-semibold text-teal tracking-wide">
            Insights
          </h3>
          <span className="text-2xs text-teal/30 bg-blue-pale px-2 py-0.5 rounded border border-blue/10">
            Computed from live data
          </span>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="py-6 flex justify-center">
              <LoadingSpinner size="sm" />
            </div>
          ) : insights.length === 0 ? (
            <p className="text-sm text-teal/40 text-center py-6 italic">
              No insights available for this client yet.
            </p>
          ) : (
            <div className="space-y-3">
              {insights.map((insight: Insight) => (
                <InsightRow key={insight.id} insight={insight} />
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-sand/40">
          <h3 className="font-heading text-sm font-semibold text-teal tracking-wide">
            Suggested actions
          </h3>
          <span className="text-2xs text-teal/30 bg-blue-pale px-2 py-0.5 rounded border border-blue/10">
            Computed from live data
          </span>
        </div>

        <div className="p-4">
          <ul className="space-y-2.5">
            {suggestedActions.map((action: string, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-teal/25 flex-shrink-0" />
                <span className="text-sm text-teal/70 leading-snug">{action}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}

function InsightRow({ insight }: { insight: Insight }) {
  const severityClass = getSeverityClass(insight.severity);
  return (
    <div className={`rounded-lg border p-3 ${severityClass}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-xs font-semibold leading-snug">{insight.title}</p>
        <span className="text-2xs opacity-60 whitespace-nowrap flex-shrink-0">
          {formatRelativeDate(insight.createdAt)}
        </span>
      </div>
      <p className="text-xs leading-relaxed opacity-80">{insight.message}</p>
    </div>
  );
}
