import { Card } from "@/components/ui/Card";
import { getDeltaClass } from "@/lib/statusHelpers";
import { formatDelta } from "@/lib/formatters";
import { cn } from "@/lib/cn";

interface MetricCard {
  label: string;
  value: string;
  delta?: number | null;
  /** True for metrics where lower is better (e.g. CPL) */
  invertDelta?: boolean;
  subtext?: string;
}

interface MetricSummaryCardsProps {
  metrics: MetricCard[];
}

export function MetricSummaryCards({ metrics }: MetricSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {metrics.map((metric) => (
        <Card key={metric.label} padding="md" className="relative overflow-hidden">
          <p className="text-xs font-medium text-teal/40 mb-1.5 truncate">
            {metric.label}
          </p>
          <p className="font-heading text-2xl font-semibold text-teal tracking-wide leading-none">
            {metric.value}
          </p>

          {/* MoM delta */}
          {metric.delta !== undefined && metric.delta !== null && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={cn(
                  "text-xs font-semibold tabular-nums",
                  getDeltaClass(metric.delta, metric.invertDelta)
                )}
              >
                {formatDelta(metric.delta)}
              </span>
              <span className="text-2xs text-teal/30">vs last month</span>
            </div>
          )}

          {metric.subtext && (
            <p className="text-2xs text-teal/30 mt-1">{metric.subtext}</p>
          )}

          {/* Subtle accent line at bottom based on delta sentiment */}
          {metric.delta !== undefined && metric.delta !== null && (
            <div
              className={cn(
                "absolute bottom-0 left-0 right-0 h-0.5",
                Math.abs(metric.delta) < 3
                  ? "bg-sand/60"
                  : (metric.invertDelta ? metric.delta < 0 : metric.delta > 0)
                  ? "bg-status-normal/40"
                  : "bg-status-action/40"
              )}
            />
          )}
        </Card>
      ))}
    </div>
  );
}
