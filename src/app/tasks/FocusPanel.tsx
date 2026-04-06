import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDueDate, formatEffort, isDueUrgent } from "@/lib/formatters";
import { cn } from "@/lib/cn";
import type { Task } from "@/types";

const CLIENT_NAMES: Record<string, string> = {
  powershift: "Powershift",
  kkcs: "KKCS",
  "caloundra-city-auto": "Caloundra City Auto",
  "caloundra-mazda": "Caloundra Mazda",
  "foundation-home": "Foundation Home Mods",
  "sell-a-car": "Sell a Car",
  "study-hub": "Study Hub",
};

interface FocusPanelProps {
  tasks: Task[];
}

export function FocusPanel({ tasks }: FocusPanelProps) {
  const topTasks = tasks
    .filter((t) => t.status !== "done")
    .slice(0, 3);

  return (
    <Card padding="none" className="mb-6 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 bg-teal/5 border-b border-sand/40">
        <span className="w-2 h-2 rounded-full bg-teal" />
        <span className="text-xs font-semibold text-teal/60 tracking-wider uppercase">
          Focus — top 3 tasks
        </span>
      </div>

      {topTasks.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm font-medium text-teal/40">You're clear</p>
          <p className="text-xs text-teal/30 mt-1">No active high-priority tasks. Add something to get started.</p>
        </div>
      ) : (
        <div className="divide-y divide-sand/30">
          {topTasks.map((task, i) => (
            <FocusTaskRow key={task.id} task={task} rank={i + 1} />
          ))}
        </div>
      )}
    </Card>
  );
}

function FocusTaskRow({ task, rank }: { task: Task; rank: number }) {
  const dueLabel = formatDueDate(task.dueDate);
  const isUrgent = isDueUrgent(task.dueDate);

  return (
    <div className="flex items-start gap-4 px-5 py-3.5">
      {/* Rank number */}
      <span className="mt-0.5 w-5 h-5 rounded-full bg-teal/8 text-teal/40 text-xs font-semibold flex items-center justify-center flex-shrink-0">
        {rank}
      </span>

      {/* Task content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-teal leading-snug">{task.title}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.clientId && (
            <span className="text-2xs text-teal/40 font-medium">
              {CLIENT_NAMES[task.clientId] ?? task.clientId}
            </span>
          )}
          {dueLabel && (
            <span className={cn("text-2xs font-medium", isUrgent ? "text-status-action" : "text-teal/35")}>
              {dueLabel}
            </span>
          )}
          {task.estimatedMinutes && (
            <span className="text-2xs text-teal/25">~{formatEffort(task.estimatedMinutes)}</span>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {task.source === "ai" && <Badge variant="ai">AI</Badge>}
        <Badge variant={task.priority as "high" | "medium" | "low"}>
          {task.priority}
        </Badge>
      </div>
    </div>
  );
}
