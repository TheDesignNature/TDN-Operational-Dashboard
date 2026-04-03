import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge, StatusDot } from "@/components/ui/StatusDot";
import { getDeltaClass } from "@/lib/statusHelpers";
import { cn } from "@/lib/cn";
import type { Client, SummaryMetric } from "@/types";

interface ClientCardProps {
  client: Client;
  simple?: boolean;
}

export function ClientCard({ client, simple = false }: ClientCardProps) {
  return (
    <Link href={`/clients/${client.id}`} className="block focus-ring rounded-card">
      <Card
        hover
        padding="none"
        className={cn(
          "overflow-hidden transition-all duration-200",
          client.status === "action" && "border-l-2 border-l-status-action",
          client.status === "watch" && "border-l-2 border-l-status-watch",
          client.status === "normal" && "border-l border-l-sand/40"
        )}
      >
        <div className="flex items-start justify-between px-4 pt-4 pb-3">
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-2 mb-0.5">
              <StatusDot status={client.status} pulse={client.status !== "normal"} />
              <h3 className="font-heading text-base font-semibold text-teal tracking-wide leading-tight truncate">
                {client.name}
              </h3>
            </div>
            <p className="text-2xs text-teal/35 font-medium uppercase tracking-wider">
              {client.industry}
            </p>
          </div>
          <StatusBadge status={client.status} />
        </div>

        <div className="px-4 pb-3">
          <p className="text-xs text-teal/55 leading-relaxed line-clamp-2">
            {client.statusMessage}
          </p>
        </div>

        {!simple && (
          <div className="grid grid-cols-2 gap-px bg-sand/30 border-t border-sand/30">
            {client.summaryMetrics.slice(0, 4).map((metric: SummaryMetric) => (
              <div key={metric.label} className="bg-white px-3 py-2.5">
                <p className="text-2xs text-teal/35 mb-0.5 truncate">{metric.label}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-semibold text-teal tabular-nums">
                    {metric.value}
                  </span>
                  {metric.delta !== undefined && metric.delta !== null && (
                    <span
                      className={cn(
                        "text-2xs font-medium tabular-nums",
                        getDeltaClass(metric.delta)
                      )}
                    >
                      {metric.delta >= 0 ? "+" : ""}
                      {metric.delta}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Link>
  );
}
