import { Card } from "@/components/ui/Card";
import { NoDataEmpty } from "@/components/ui/EmptyState";
import {
  formatCurrency,
  formatNumber,
  formatDelta,
  formatPercentAbsolute,
} from "@/lib/formatters";
import { getDeltaClass } from "@/lib/statusHelpers";
import { cn } from "@/lib/cn";
import type { PowershiftMonthlyRow } from "@/types";

interface MonthlyTableProps {
  data: PowershiftMonthlyRow[];
}

function DeltaCell({
  value,
  invertGood = false,
}: {
  value: number | null;
  invertGood?: boolean;
}) {
  if (value === null || value === undefined) {
    return <span className="text-teal/25">—</span>;
  }
  return (
    <span className={cn("tabular-nums text-xs font-medium", getDeltaClass(value, invertGood))}>
      {formatDelta(value)}
    </span>
  );
}

export function MonthlyTable({ data }: MonthlyTableProps) {
  if (!data || data.length === 0) {
    return (
      <Card padding="none" className="mb-6 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-sand/40">
          <h3 className="font-heading text-sm font-semibold text-teal tracking-wide">
            Monthly performance
          </h3>
        </div>
        <NoDataEmpty />
      </Card>
    );
  }

  // Most recent first
  const sorted = [...data].sort((a, b) =>
    b.metric_date.localeCompare(a.metric_date)
  );

  return (
    <Card padding="none" className="mb-6 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-sand/40">
        <div>
          <h3 className="font-heading text-sm font-semibold text-teal tracking-wide">
            Monthly performance
          </h3>
          <p className="text-2xs text-teal/35 mt-0.5">
            Source: Supabase · powershift_monthly_report · {data.length} months
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white z-10 min-w-[100px]">Month</th>
              <th className="min-w-[90px]">Spend</th>
              <th className="min-w-[60px]">Traffic</th>
              <th className="min-w-[80px]">Enquiries</th>
              <th className="min-w-[70px]">CPL</th>
              <th className="min-w-[60px]">WCR%</th>
              <th className="min-w-[80px] text-teal/40">MoM Spend</th>
              <th className="min-w-[80px] text-teal/40">MoM Traffic</th>
              <th className="min-w-[90px] text-teal/40">MoM Enquiries</th>
              <th className="min-w-[70px] text-teal/40">MoM CPL</th>
              <th className="min-w-[70px] text-teal/40">MoM WCR</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={row.metric_date} className={i === 0 ? "bg-teal/5 font-medium" : ""}>
                <td className="sticky left-0 bg-white z-10 font-medium text-teal/80">
                  {row.month_label}
                  {i === 0 && (
                    <span className="ml-2 text-2xs bg-teal text-white px-1.5 py-0.5 rounded font-medium">
                      Latest
                    </span>
                  )}
                </td>
                <td>{formatCurrency(row.spend)}</td>
                <td>{formatNumber(row.traffic)}</td>
                <td>{formatNumber(row.enquiries)}</td>
                <td>{formatCurrency(row.cost_per_lead)}</td>
                <td>{formatPercentAbsolute(row.website_conversion_rate_pct)}</td>
                <td><DeltaCell value={row.mom_spend_pct} /></td>
                <td><DeltaCell value={row.mom_traffic_pct} /></td>
                <td><DeltaCell value={row.mom_enquiries_pct} /></td>
                <td><DeltaCell value={row.mom_cpl_pct} invertGood /></td>
                <td><DeltaCell value={row.mom_website_conversion_rate_pct} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
