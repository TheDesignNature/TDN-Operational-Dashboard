"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getDailySummary, getAlerts } from "@/services/openClawService";
import { getAllTasks } from "@/services/tasksService";
import { formatDueDate, formatEffort } from "@/lib/formatters";
import { cn } from "@/lib/cn";
import type { Task, Alert } from "@/types";

const CLIENT_NAMES: Record<string, string> = {
  powershift: "Powershift",
  kkcs: "KKCS",
  "caloundra-city-auto": "Caloundra City Auto",
  "caloundra-mazda": "Caloundra Mazda",
  "foundation-home": "Foundation Home Mods",
  "sell-a-car": "Sell a Car",
  "study-hub": "Study Hub",
};

export function RecommendedActions() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDailySummary(), getAllTasks(), getAlerts()]).then(
      ([summary, allTasks, allAlerts]) => {
        const recommended = allTasks.filter(
          (t) =>
            summary.recommendedTaskIds.includes(t.id) && t.status !== "done"
        );
        setTasks(recommended.slice(0, 5));
        setAlerts(allAlerts.slice(0, 4));
        setLoading(false);
      }
    );
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card padding="lg"><LoadingSpinner size="sm" /></Card>
        <Card padding="lg"><LoadingSpinner size="sm" /></Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      {/* Recommended tasks */}
      <Card padding="none" className="overflow-hidden">
        <div className="px-5 py-3.5 border-b border-sand/40">
          <h3 className="font-heading text-sm font-semibold text-teal tracking-wide">
            Recommended tasks today
          </h3>
        </div>
        <div className="divide-y divide-sand/20">
          {tasks.length === 0 ? (
            <p className="px-5 py-8 text-sm text-teal/35 text-center italic">
              No tasks recommended — you might be all clear.
            </p>
          ) : (
            tasks.map((task, i) => (
              <div key={task.id} className="flex items-start gap-3 px-5 py-3">
                <span className="mt-0.5 w-4 h-4 rounded-full bg-teal/8 text-teal/40 text-2xs font-semibold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-teal leading-snug">
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {task.clientId && (
                      <span className="text-2xs text-teal/40">
                        {CLIENT_NAMES[task.clientId]}
                      </span>
                    )}
                    {task.estimatedMinutes && (
                      <span className="text-2xs text-teal/30">
                        ~{formatEffort(task.estimatedMinutes)}
                      </span>
                    )}
                  </div>
                </div>
                <Badge variant={task.priority as "high" | "medium" | "low"}>
                  {task.priority}
                </Badge>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Priority alerts */}
      <Card padding="none" className="overflow-hidden">
        <div className="px-5 py-3.5 border-b border-sand/40">
          <h3 className="font-heading text-sm font-semibold text-teal tracking-wide">
            Priority alerts
          </h3>
        </div>
        <div className="divide-y divide-sand/20">
          {alerts.length === 0 ? (
            <p className="px-5 py-8 text-sm text-teal/35 text-center italic">
              No active alerts.
            </p>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 px-5 py-3">
                <span
                  className={cn(
                    "mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0",
                    alert.severity === "critical"
                      ? "bg-status-action"
                      : "bg-status-watch"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-teal/75 leading-snug">{alert.message}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-2xs text-teal/40 font-medium">
                      {CLIENT_NAMES[alert.clientId] ?? alert.clientId}
                    </span>
                    <span
                      className={cn(
                        "text-2xs font-semibold tabular-nums",
                        alert.deltaPercent < 0 ? "text-status-action" : "text-status-watch"
                      )}
                    >
                      {alert.deltaPercent > 0 ? "+" : ""}
                      {alert.deltaPercent}%
                    </span>
                  </div>
                </div>
                <a
                  href={`/clients/${alert.clientId}`}
                  className="text-2xs text-teal/30 hover:text-teal transition-colors flex-shrink-0 mt-0.5"
                >
                  View →
                </a>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
