/**
 * Tasks service
 *
 * Uses an in-memory store for now. When you're ready to persist tasks,
 * replace each function with a Supabase query against the `tasks` table.
 *
 * The Task type in src/types/index.ts matches the expected Supabase schema.
 */

import type { Task, TaskBucket, TaskStatus } from "@/types";
import { getAISuggestedTasks } from "./openClawService";

// ── In-memory store ───────────────────────────────────────────
// Seeded with AI-suggested tasks plus a few manual ones.
// In production this would be replaced by Supabase reads/writes.

let taskStore: Task[] | null = null;

async function getStore(): Promise<Task[]> {
  if (taskStore !== null) return taskStore;

  const aiTasks = await getAISuggestedTasks();

  const manualTasks: Task[] = [
    {
      id: "manual-1",
      title: "Send October performance reports to all clients",
      clientId: null,
      priority: "high",
      status: "todo",
      dueDate: new Date().toISOString().split("T")[0],
      source: "manual",
      notes: "Use the standard PDF template. CC account manager.",
      estimatedMinutes: 120,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      order: 10,
    },
    {
      id: "manual-2",
      title: "Update Caloundra Mazda ad creative",
      clientId: "caloundra-mazda",
      priority: "medium",
      status: "in_progress",
      dueDate: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        return d.toISOString().split("T")[0];
      })(),
      source: "manual",
      notes: "New vehicle imagery received from client. Update responsive search ads.",
      estimatedMinutes: 45,
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      order: 11,
    },
    {
      id: "manual-3",
      title: "Schedule KKCS strategy call",
      clientId: "kkcs",
      priority: "medium",
      status: "todo",
      dueDate: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 4);
        return d.toISOString().split("T")[0];
      })(),
      source: "manual",
      notes: "Discuss Q4 budget and Study Hub cross-sell opportunity.",
      estimatedMinutes: 30,
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      order: 12,
    },
    {
      id: "manual-4",
      title: "Review Sell a Car Google Ads auction insights",
      clientId: "sell-a-car",
      priority: "low",
      status: "todo",
      dueDate: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().split("T")[0];
      })(),
      source: "manual",
      notes: null,
      estimatedMinutes: 20,
      createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
      order: 13,
    },
    {
      id: "manual-5",
      title: "Renew Google Ads API credentials",
      clientId: null,
      priority: "low",
      status: "todo",
      dueDate: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        return d.toISOString().split("T")[0];
      })(),
      source: "manual",
      notes: "Credentials expire end of month.",
      estimatedMinutes: 15,
      createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
      order: 14,
    },
  ];

  taskStore = [...aiTasks, ...manualTasks];
  return taskStore;
}

// ── Bucket assignment logic ───────────────────────────────────

function assignBucket(task: Task): TaskBucket {
  if (task.status === "done") return "backlog";
  if (!task.dueDate) return "backlog";

  const due = new Date(task.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.floor(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays <= 0) return "today";
  if (diffDays <= 6) return "week";
  return "backlog";
}

// ── Service functions ─────────────────────────────────────────

export async function getAllTasks(): Promise<Task[]> {
  return getStore();
}

export async function getTasksByBucket(bucket: TaskBucket): Promise<Task[]> {
  const all = await getStore();
  return all
    .filter((t) => assignBucket(t) === bucket)
    .sort((a, b) => {
      // High priority first, then by order
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      const pd = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pd !== 0) return pd;
      return a.order - b.order;
    });
}

export async function getTasksForClient(clientId: string): Promise<Task[]> {
  const all = await getStore();
  return all.filter((t) => t.clientId === clientId && t.status !== "done");
}

export async function addTask(
  input: Omit<Task, "id" | "createdAt" | "order">
): Promise<Task> {
  const store = await getStore();
  const maxOrder = store.reduce((m, t) => Math.max(m, t.order), 0);
  const task: Task = {
    ...input,
    id: `task-${Date.now()}`,
    createdAt: new Date().toISOString(),
    order: maxOrder + 1,
  };
  taskStore = [...store, task];
  return task;
}

export async function updateTask(
  id: string,
  updates: Partial<Omit<Task, "id" | "createdAt">>
): Promise<Task> {
  const store = await getStore();
  const index = store.findIndex((t) => t.id === id);
  if (index === -1) throw new Error(`Task ${id} not found`);
  const updated = { ...store[index], ...updates };
  taskStore = store.map((t) => (t.id === id ? updated : t));
  return updated;
}

export async function deleteTask(id: string): Promise<void> {
  const store = await getStore();
  taskStore = store.filter((t) => t.id !== id);
}

export async function reorderTask(
  id: string,
  direction: "up" | "down"
): Promise<void> {
  const store = await getStore();
  const task = store.find((t) => t.id === id);
  if (!task) return;

  const bucket = assignBucket(task);
  const bucketTasks = store
    .filter((t) => assignBucket(t) === bucket)
    .sort((a, b) => a.order - b.order);

  const idx = bucketTasks.findIndex((t) => t.id === id);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= bucketTasks.length) return;

  const swapTask = bucketTasks[swapIdx];
  const tempOrder = task.order;

  taskStore = store.map((t) => {
    if (t.id === id) return { ...t, order: swapTask.order };
    if (t.id === swapTask.id) return { ...t, order: tempOrder };
    return t;
  });
}
