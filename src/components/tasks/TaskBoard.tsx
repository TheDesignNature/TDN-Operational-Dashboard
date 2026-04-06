"use client";

import { useEffect, useState, useCallback, type ChangeEvent } from "react";
import { TaskItem } from "./TaskItem";
import { FocusPanel } from "./FocusPanel";
import { AddTaskModal } from "./AddTaskModal";
import { Card } from "@/components/ui/Card";
import { NoTasksEmpty } from "@/components/ui/EmptyState";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { getAllTasks, getTasksByBucket } from "@/services/tasksService";
import { cn } from "@/lib/cn";
import type { Task, TaskBucket } from "@/types";

const BUCKETS: { key: TaskBucket; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "backlog", label: "Backlog" },
];

const CLIENT_OPTIONS = [
  { id: "", name: "All clients" },
  { id: "powershift", name: "Powershift" },
  { id: "kkcs", name: "KKCS" },
  { id: "caloundra-city-auto", name: "Caloundra City Auto" },
  { id: "caloundra-mazda", name: "Caloundra Mazda" },
  { id: "foundation-home", name: "Foundation Home Mods" },
  { id: "sell-a-car", name: "Sell a Car" },
  { id: "study-hub", name: "Study Hub" },
];

const SOURCE_OPTIONS = [
  { id: "", name: "All sources" },
  { id: "manual", name: "Manual" },
  { id: "ai", name: "AI suggested" },
  { id: "openclaw", name: "OpenClaw" },
  { id: "outlook", name: "Outlook" },
  { id: "sms", name: "SMS" },
  { id: "slack", name: "Slack" },
];

type ViewMode = "list" | "calendar";
type BucketCounts = Record<TaskBucket, number>;

const CLIENT_NAMES: Record<string, string> = {
  powershift: "Powershift",
  kkcs: "KKCS",
  "caloundra-city-auto": "Cal City Auto",
  "caloundra-mazda": "Cal Mazda",
  "foundation-home": "FHM",
  "sell-a-car": "Sell a Car",
  "study-hub": "Study Hub",
};

const CLIENT_COLORS: Record<string, string> = {
  powershift: "bg-teal text-white",
  kkcs: "bg-blue-500 text-white",
  "caloundra-city-auto": "bg-emerald-600 text-white",
  "caloundra-mazda": "bg-violet-600 text-white",
  "foundation-home": "bg-amber-600 text-white",
  "sell-a-car": "bg-rose-600 text-white",
  "study-hub": "bg-indigo-600 text-white",
};

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-400",
  low: "bg-emerald-400",
};

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

// ── Calendar view ─────────────────────────────────────────────

function CalendarView({
  tasks,
  filterClient,
  onAddTask,
}: {
  tasks: Task[];
  filterClient: string;
  onAddTask: () => void;
}) {
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();

  // Days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  // Adjust for Monday start
  const startOffset = (firstDayOfWeek + 6) % 7;

  const todayStr = getTodayStr();

  // Filter tasks to current month and client
  const filteredTasks = tasks.filter((t) => {
    if (!t.dueDate) return false;
    if (filterClient && t.clientId !== filterClient) return false;
    const d = new Date(t.dueDate);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  // Group by day
  const byDay: Record<number, Task[]> = {};
  filteredTasks.forEach((t) => {
    const day = new Date(t.dueDate!).getDate();
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(t);
  });

  const monthLabel = calMonth.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - startOffset + 1;
    return dayNum >= 1 && dayNum <= daysInMonth ? dayNum : null;
  });

  return (
    <div className="bg-white rounded-card border border-sand/40 overflow-hidden">
      {/* Calendar header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-sand/40">
        <button
          onClick={() => setCalMonth(new Date(year, month - 1, 1))}
          className="p-1.5 rounded text-teal/40 hover:text-teal hover:bg-stone transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h3 className="font-heading text-sm font-semibold text-teal">{monthLabel}</h3>
        <button
          onClick={() => setCalMonth(new Date(year, month + 1, 1))}
          className="p-1.5 rounded text-teal/40 hover:text-teal hover:bg-stone transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 border-b border-sand/30">
        {dayLabels.map((d) => (
          <div key={d} className="text-center text-2xs font-medium text-teal/40 py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 divide-x divide-sand/20">
        {cells.map((day, i) => {
          const isToday = day !== null &&
            `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` === todayStr;
          const dayTasks = day ? (byDay[day] ?? []) : [];
          const isWeekend = i % 7 >= 5;

          return (
            <div
              key={i}
              className={cn(
                "min-h-[80px] p-1.5 border-b border-sand/20 relative",
                day === null ? "bg-stone/30" : isWeekend ? "bg-stone/20" : "bg-white",
                day !== null && "hover:bg-stone/30 transition-colors"
              )}
            >
              {day !== null && (
                <>
                  <span
                    className={cn(
                      "text-xs font-medium inline-flex items-center justify-center w-5 h-5 rounded-full mb-1",
                      isToday ? "bg-teal text-white" : "text-teal/50"
                    )}
                  >
                    {day}
                  </span>
                  <div className="space-y-0.5">
                    {dayTasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        className={cn(
                          "text-2xs px-1.5 py-0.5 rounded truncate flex items-center gap-1",
                          task.clientId
                            ? CLIENT_COLORS[task.clientId] ?? "bg-teal/10 text-teal"
                            : "bg-sand/60 text-teal/70"
                        )}
                        title={task.title}
                      >
                        <span
                          className={cn("w-1 h-1 rounded-full flex-shrink-0", PRIORITY_DOT[task.priority])}
                        />
                        <span className="truncate">{task.title}</span>
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <p className="text-2xs text-teal/40 pl-1">+{dayTasks.length - 3} more</p>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="px-5 py-3 border-t border-sand/30 flex items-center gap-4 flex-wrap">
        <span className="text-2xs text-teal/40 font-medium">Clients:</span>
        {Object.entries(CLIENT_NAMES).map(([id, name]) => (
          <span key={id} className={cn("text-2xs px-1.5 py-0.5 rounded", CLIENT_COLORS[id] ?? "bg-sand/60 text-teal/70")}>
            {name}
          </span>
        ))}
        <button onClick={onAddTask} className="ml-auto text-2xs text-teal/50 hover:text-teal transition-colors">
          + Add task
        </button>
      </div>
    </div>
  );
}

// ── Main TaskBoard ────────────────────────────────────────────

export function TaskBoard() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [activeBucket, setActiveBucket] = useState<TaskBucket>("today");
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [bucketTasks, setBucketTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterClient, setFilterClient] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterSource, setFilterSource] = useState("");

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [all, bucket] = await Promise.all([
        getAllTasks(),
        getTasksByBucket(activeBucket),
      ]);
      setAllTasks(all);
      setBucketTasks(bucket);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [activeBucket]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  function handleTaskUpdated(updated: Task) {
    setAllTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t));
    setBucketTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t));
  }

  function handleTaskDeleted(id: string) {
    setAllTasks((prev) => prev.filter((t) => t.id !== id));
    setBucketTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function handleTaskCreated(_task: Task) {
    setShowAddModal(false);
    loadTasks();
  }

  const todayStr = getTodayStr();

  const visibleTasks = bucketTasks.filter((t) => {
    if (filterClient && t.clientId !== filterClient) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterSource && t.source !== filterSource) return false;
    return true;
  });

  const todayTasks = allTasks.filter(
    (t) => t.status !== "done" && t.dueDate === todayStr
  );

  const bucketCounts: BucketCounts = {
    today: allTasks.filter((t) => t.status !== "done" && t.dueDate === todayStr).length,
    week: allTasks.filter((t) => {
      if (t.status === "done" || !t.dueDate) return false;
      const due = new Date(t.dueDate);
      const now = new Date(); now.setHours(0, 0, 0, 0); due.setHours(0, 0, 0, 0);
      const diff = Math.floor((due.getTime() - now.getTime()) / 86400000);
      return diff > 0 && diff <= 6;
    }).length,
    backlog: allTasks.filter((t) => {
      if (t.status === "done") return false;
      if (!t.dueDate) return true;
      const due = new Date(t.dueDate);
      const now = new Date(); now.setHours(0, 0, 0, 0); due.setHours(0, 0, 0, 0);
      return Math.floor((due.getTime() - now.getTime()) / 86400000) > 6;
    }).length,
  };

  return (
    <div className="max-w-4xl mx-auto">
      <FocusPanel tasks={todayTasks.length > 0 ? todayTasks : allTasks} />

      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-white border border-sand/60 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                viewMode === "list" ? "bg-teal text-white shadow-sm" : "text-teal/50 hover:text-teal hover:bg-stone"
              )}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 6h11M9 12h11M9 18h11M5 6h.01M5 12h.01M5 18h.01" strokeLinecap="round" />
              </svg>
              List
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                viewMode === "calendar" ? "bg-teal text-white shadow-sm" : "text-teal/50 hover:text-teal hover:bg-stone"
              )}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
              </svg>
              Calendar
            </button>
          </div>

          {/* Bucket tabs — list view only */}
          {viewMode === "list" && (
            <div className="flex items-center bg-white border border-sand/60 rounded-lg p-0.5">
              {BUCKETS.map((b) => (
                <button
                  key={b.key}
                  onClick={() => setActiveBucket(b.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                    activeBucket === b.key
                      ? "bg-teal text-white shadow-sm"
                      : "text-teal/50 hover:text-teal hover:bg-stone"
                  )}
                >
                  {b.label}
                  {bucketCounts[b.key] > 0 && (
                    <span className={cn(
                      "text-xs w-4 h-4 rounded-full flex items-center justify-center leading-none",
                      activeBucket === b.key ? "bg-white/20 text-white" : "bg-sand/60 text-teal/50"
                    )}>
                      {bucketCounts[b.key]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Add task
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <select
          value={filterClient}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterClient(e.target.value)}
          className="text-xs px-2.5 py-1.5 bg-white border border-sand/60 rounded-lg text-teal/60 focus:outline-none focus:border-teal/30"
        >
          {CLIENT_OPTIONS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select
          value={filterPriority}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterPriority(e.target.value)}
          className="text-xs px-2.5 py-1.5 bg-white border border-sand/60 rounded-lg text-teal/60 focus:outline-none focus:border-teal/30"
        >
          <option value="">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={filterSource}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterSource(e.target.value)}
          className="text-xs px-2.5 py-1.5 bg-white border border-sand/60 rounded-lg text-teal/60 focus:outline-none focus:border-teal/30"
        >
          {SOURCE_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        {(filterClient || filterPriority || filterSource) && (
          <button
            onClick={() => { setFilterClient(""); setFilterPriority(""); setFilterSource(""); }}
            className="text-xs text-teal/40 hover:text-teal transition-colors px-2 py-1.5"
          >
            Clear filters
          </button>
        )}

        {/* Task count */}
        <span className="ml-auto text-xs text-teal/30">
          {viewMode === "list" ? `${visibleTasks.length} task${visibleTasks.length !== 1 ? "s" : ""}` : `${allTasks.filter(t => t.status !== "done").length} active`}
        </span>
      </div>

      {/* Calendar view */}
      {viewMode === "calendar" && (
        <CalendarView
          tasks={allTasks}
          filterClient={filterClient}
          onAddTask={() => setShowAddModal(true)}
        />
      )}

      {/* List view */}
      {viewMode === "list" && (
        <Card padding="none" className="overflow-hidden">
          {loading ? (
            <div className="py-12 flex justify-center"><PageLoader /></div>
          ) : error ? (
            <ErrorState message={error} retry={loadTasks} size="sm" />
          ) : visibleTasks.length === 0 ? (
            <NoTasksEmpty onAdd={() => setShowAddModal(true)} />
          ) : (
            <div className="divide-y divide-sand/30">
              {visibleTasks.map((task, i) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onUpdated={handleTaskUpdated}
                  onDeleted={handleTaskDeleted}
                  onReordered={loadTasks}
                  isFirst={i === 0}
                  isLast={i === visibleTasks.length - 1}
                />
              ))}
            </div>
          )}
        </Card>
      )}

      {showAddModal && (
        <AddTaskModal
          onClose={() => setShowAddModal(false)}
          onCreated={handleTaskCreated}
        />
      )}
    </div>
  );
}
