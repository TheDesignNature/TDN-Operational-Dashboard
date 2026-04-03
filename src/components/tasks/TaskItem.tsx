"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { updateTask, deleteTask, reorderTask } from "@/services/tasksService";
import { formatDueDate, formatEffort, isDueUrgent } from "@/lib/formatters";
import { getPriorityStyle } from "@/lib/statusHelpers";
import { cn } from "@/lib/cn";
import type { Task, TaskPriority } from "@/types";

// Client name lookup — in production this would come from the clients service
const CLIENT_NAMES: Record<string, string> = {
  powershift: "Powershift",
  kkcs: "KKCS",
  "caloundra-city-auto": "Caloundra City Auto",
  "caloundra-mazda": "Caloundra Mazda",
  "foundation-home": "Foundation Home Mods",
  "sell-a-car": "Sell a Car",
  "study-hub": "Study Hub",
};

interface TaskItemProps {
  task: Task;
  onUpdated: (task: Task) => void;
  onDeleted: (id: string) => void;
  onReordered: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export function TaskItem({
  task,
  onUpdated,
  onDeleted,
  onReordered,
  isFirst,
  isLast,
}: TaskItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [completing, setCompleting] = useState(false);

  const priority = getPriorityStyle(task.priority);
  const dueLabel = formatDueDate(task.dueDate);
  const isUrgent = isDueUrgent(task.dueDate);
  const isDone = task.status === "done";

  async function handleToggleComplete() {
    setCompleting(true);
    try {
      const updated = await updateTask(task.id, {
        status: isDone ? "todo" : "done",
      });
      onUpdated(updated);
    } finally {
      setCompleting(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${task.title}"?`)) return;
    await deleteTask(task.id);
    onDeleted(task.id);
  }

  async function handleReorder(direction: "up" | "down") {
    await reorderTask(task.id, direction);
    onReordered();
  }

  async function handlePriorityChange(p: TaskPriority) {
    const updated = await updateTask(task.id, { priority: p });
    onUpdated(updated);
  }

  return (
    <div
      className={cn(
        "group border-b border-sand/30 last:border-b-0 transition-colors",
        isDone ? "bg-stone/40" : "bg-white hover:bg-stone/30"
      )}
    >
      {/* Main row */}
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Complete checkbox */}
        <button
          onClick={handleToggleComplete}
          disabled={completing}
          className={cn(
            "mt-0.5 w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-all",
            isDone
              ? "bg-teal border-teal"
              : "border-sand hover:border-teal/50"
          )}
          aria-label={isDone ? "Mark incomplete" : "Mark complete"}
        >
          {isDone && (
            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
              <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <button
              onClick={() => setExpanded((v: boolean) => !v)}
              className={cn(
                "text-sm font-medium text-left transition-colors leading-snug",
                isDone ? "line-through text-teal/30" : "text-teal hover:text-teal-mid"
              )}
            >
              {task.title}
            </button>

            {/* Meta badges */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {task.source === "ai" && (
                <Badge variant="ai">AI</Badge>
              )}
              <Badge variant={task.priority as "high" | "medium" | "low"}>
                {priority.label}
              </Badge>
            </div>
          </div>

          {/* Sub-meta */}
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {task.clientId && (
              <span className="text-2xs text-teal/40 font-medium">
                {CLIENT_NAMES[task.clientId] ?? task.clientId}
              </span>
            )}
            {dueLabel && (
              <span
                className={cn(
                  "text-2xs font-medium",
                  isUrgent && !isDone ? "text-status-action" : "text-teal/35"
                )}
              >
                {dueLabel}
              </span>
            )}
            {task.estimatedMinutes && (
              <span className="text-2xs text-teal/30">
                ~{formatEffort(task.estimatedMinutes)}
              </span>
            )}
          </div>
        </div>

        {/* Actions — visible on hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {/* Reorder up */}
          <button
            onClick={() => handleReorder("up")}
            disabled={isFirst}
            className="p-1 rounded text-teal/30 hover:text-teal hover:bg-sand/40 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            aria-label="Move up"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 15l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {/* Reorder down */}
          <button
            onClick={() => handleReorder("down")}
            disabled={isLast}
            className="p-1 rounded text-teal/30 hover:text-teal hover:bg-sand/40 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            aria-label="Move down"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {/* Delete */}
          <button
            onClick={handleDelete}
            className="p-1 rounded text-teal/30 hover:text-status-action hover:bg-status-action-bg transition-colors ml-0.5"
            aria-label="Delete task"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded notes + priority edit */}
      {expanded && (
        <div className="px-4 pb-3 ml-7 border-t border-sand/20 pt-3">
          {task.notes && (
            <p className="text-xs text-teal/55 leading-relaxed mb-3 bg-stone/50 rounded px-3 py-2">
              {task.notes}
            </p>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xs text-teal/40 font-medium">Priority:</span>
            {(["high", "medium", "low"] as TaskPriority[]).map((p) => (
              <button
                key={p}
                onClick={() => handlePriorityChange(p)}
                className={cn(
                  "text-2xs px-2 py-1 rounded border capitalize transition-colors",
                  task.priority === p
                    ? p === "high"
                      ? "bg-status-action-bg text-status-action border-status-action-border"
                      : p === "medium"
                      ? "bg-status-watch-bg text-status-watch border-status-watch-border"
                      : "bg-teal-pale text-teal border-teal/20"
                    : "text-teal/40 border-sand/50 hover:border-sand"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
