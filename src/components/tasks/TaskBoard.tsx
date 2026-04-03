"use client";

import { useEffect, useState, useCallback } from "react";
import { TaskItem } from "./TaskItem";
import { FocusPanel } from "./FocusPanel";
import { AddTaskModal } from "./AddTaskModal";
import { Card } from "@/components/ui/Card";
import { NoTasksEmpty } from "@/components/ui/EmptyState";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import {
  getAllTasks,
  getTasksByBucket,
} from "@/services/tasksService";
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

export function TaskBoard() {
  const [activeBucket, setActiveBucket] = useState<TaskBucket>("today");
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [bucketTasks, setBucketTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Filters
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
    setAllTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setBucketTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  function handleTaskDeleted(id: string) {
    setAllTasks((prev) => prev.filter((t) => t.id !== id));
    setBucketTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function handleTaskCreated(task: Task) {
    setShowAddModal(false);
    loadTasks(); // reload to correctly place in buckets
  }

  // Apply filters client-side
  const visibleTasks = bucketTasks.filter((t) => {
    if (filterClient && t.clientId !== filterClient) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterSource && t.source !== filterSource) return false;
    return true;
  });

  const todayTasks = allTasks.filter(
    (t) => t.status !== "done" && t.dueDate === new Date().toISOString().split("T")[0]
  );

  // Bucket counts (unfiltered, undone only)
  const bucketCounts = {
    today: allTasks.filter(
      (t) => t.status !== "done" && t.dueDate === new Date().toISOString().split("T")[0]
    ).length,
    week: allTasks.filter((t) => {
      if (t.status === "done" || !t.dueDate) return false;
      const due = new Date(t.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      due.setHours(0, 0, 0, 0);
      const diff = Math.floor((due.getTime() - today.getTime()) / 86400000);
      return diff > 0 && diff <= 6;
    }).length,
    backlog: allTasks.filter((t) => {
      if (t.status === "done" || !t.dueDate) return t.status !== "done";
      const due = new Date(t.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      due.setHours(0, 0, 0, 0);
      const diff = Math.floor((due.getTime() - today.getTime()) / 86400000);
      return diff > 6;
    }).length,
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Focus panel — always shown at top */}
      <FocusPanel tasks={todayTasks.length > 0 ? todayTasks : allTasks} />

      {/* Task board header */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        {/* Bucket tabs */}
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
                <span
                  className={cn(
                    "text-xs w-4 h-4 rounded-full flex items-center justify-center leading-none",
                    activeBucket === b.key
                      ? "bg-white/20 text-white"
                      : "bg-sand/60 text-teal/50"
                  )}
                >
                  {bucketCounts[b.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Add task */}
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Add task
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <select
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
          className="text-xs px-2.5 py-1.5 bg-white border border-sand/60 rounded-lg text-teal/60 focus:outline-none focus:border-teal/30"
        >
          {CLIENT_OPTIONS.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="text-xs px-2.5 py-1.5 bg-white border border-sand/60 rounded-lg text-teal/60 focus:outline-none focus:border-teal/30"
        >
          <option value="">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="text-xs px-2.5 py-1.5 bg-white border border-sand/60 rounded-lg text-teal/60 focus:outline-none focus:border-teal/30"
        >
          <option value="">All sources</option>
          <option value="ai">AI suggested</option>
          <option value="manual">Manual</option>
        </select>

        {(filterClient || filterPriority || filterSource) && (
          <button
            onClick={() => { setFilterClient(""); setFilterPriority(""); setFilterSource(""); }}
            className="text-xs text-teal/40 hover:text-teal transition-colors px-2 py-1.5"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Task list */}
      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center">
            <PageLoader />
          </div>
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

      {/* Add task modal */}
      {showAddModal && (
        <AddTaskModal
          onClose={() => setShowAddModal(false)}
          onCreated={handleTaskCreated}
        />
      )}
    </div>
  );
}
