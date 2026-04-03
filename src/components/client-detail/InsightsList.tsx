"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getSeverityClass } from "@/lib/statusHelpers";
import { formatRelativeDate } from "@/lib/formatters";
import { getInsightsForClient } from "@/services/openClawService";
import type { Insight } from "@/types";

const SUGGESTED_ACTIONS: Record<string, string[]> = {
  powershift: [
    "Audit landing page load speed and form functionality on mobile",
    "Review search term report for audience quality — look for broad match bleed",
    "Check auction insights for increased competitor activity",
    "Compare current ad copy CTR against previous period",
  ],
  kkcs: [
    "Review highest-traffic landing pages for conversion friction",
    "Check form completion rate vs form view rate",
    "Test page speed on mobile — common cause of flat conversion",
  ],
  "caloundra-mazda": [
    "Review campaign structure and bid strategy for efficiency",
    "Audit negative keyword list — CPL creep often signals audience pollution",
    "Check ad scheduling for off-peak spend waste",
  ],
  "foundation-home": [
    "Check all active ad approval statuses",
    "Review audience size — exhaustion causes delivery failures",
    "Audit daily budget caps — ensure they are not too low for monthly targets",
    "Check bid strategy — consider switching to Max Conversions with target CPA",
  ],
};

const DEFAULT_ACTIONS = [
  "Review campaign performance vs target metrics",
  "Check search term and audience reports",
  "Audit ad creative performance — identify top and bottom performers",
];

interface InsightsListProps {
  clientId: string;
}

export function InsightsList({ clientId }: InsightsListProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInsightsForClient(clientId).then((data: Insight[]) => {
      setInsights(data);
      setLoading(false);
    });
  }, [clientId]);

  const suggestedActions = SUGGESTED_ACTIONS[clientId] ?? DEFAULT_ACTIONS;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <Card padding="none" className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-sand/40">
          <h3 className="font-heading text-sm font-semibold text-teal tracking-wide">
            Insights
          </h3>
          <span className="text-2xs text-teal/30 bg-blue-pale px-2 py-0.5 rounded border border-blue/10">
            AI · mock data
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
            AI · mock data
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
