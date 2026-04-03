"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/formatters";
import type { PowershiftMonthlyRow } from "@/types";

interface PerformanceChartProps {
  data: PowershiftMonthlyRow[];
}

interface ChartPoint {
  month: string;
  enquiries: number;
  spend: number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white border border-sand/60 rounded-lg shadow-card px-3 py-2.5 text-sm">
      <p className="font-medium text-teal mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1 last:mb-0">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-teal/60 capitalize">{entry.name}:</span>
          <span className="font-semibold text-teal tabular-nums">
            {entry.name === "spend"
              ? formatCurrency(entry.value)
              : entry.value.toLocaleString("en-AU")}
          </span>
        </div>
      ))}
    </div>
  );
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card padding="lg" className="mb-6">
        <p className="text-sm text-teal/40 text-center py-8">
          No chart data available yet.
        </p>
      </Card>
    );
  }

  // Use month_label directly from the view — already formatted
  const chartData: ChartPoint[] = data.map((row) => ({
    month: row.month_label,
    enquiries: row.enquiries,
    spend: row.spend,
  }));

  return (
    <Card padding="none" className="mb-6 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-sand/40">
        <div>
          <h3 className="font-heading text-sm font-semibold text-teal tracking-wide">
            Enquiries &amp; spend over time
          </h3>
          <p className="text-2xs text-teal/35 mt-0.5">
            Monthly trend — last {data.length} months
          </p>
        </div>
      </div>

      <div className="p-5">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={chartData}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(200,189,172,0.4)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "rgba(28,59,68,0.4)", fontFamily: "'DM Sans', sans-serif" }}
              axisLine={false}
              tickLine={false}
              dy={6}
            />
            <YAxis
              yAxisId="enquiries"
              orientation="left"
              tick={{ fontSize: 11, fill: "rgba(28,59,68,0.4)", fontFamily: "'DM Sans', sans-serif" }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <YAxis
              yAxisId="spend"
              orientation="right"
              tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`}
              tick={{ fontSize: 11, fill: "rgba(28,59,68,0.4)", fontFamily: "'DM Sans', sans-serif" }}
              axisLine={false}
              tickLine={false}
              width={42}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={7}
              wrapperStyle={{
                fontSize: "12px",
                paddingTop: "12px",
                color: "rgba(28,59,68,0.6)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            />
            <Line
              yAxisId="enquiries"
              type="monotone"
              dataKey="enquiries"
              stroke="#1C3B44"
              strokeWidth={2}
              dot={{ r: 3, fill: "#1C3B44", strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
            <Line
              yAxisId="spend"
              type="monotone"
              dataKey="spend"
              stroke="#A1B4B7"
              strokeWidth={2}
              dot={{ r: 3, fill: "#A1B4B7", strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
              strokeDasharray="4 3"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
