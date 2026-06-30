/**
 * OpenClaw Service
 *
 * "OpenClaw" was a placeholder name for an AI integration that was never
 * built — this file used to return hardcoded MOCK_ALERTS / MOCK_INSIGHTS /
 * MOCK_AI_TASKS regardless of what was actually happening with any client.
 *
 * It now returns alerts/insights/daily-summary/suggested-tasks computed
 * deterministically from real Supabase numbers via the insights engine
 * (src/lib/insightsEngine.ts), served by /api/dashboard/summary and
 * /api/clients/[id]/insights. No AI/LLM call is involved — see
 * insightsEngine.ts for the threshold rules and their reasoning.
 *
 * askAssistant() is the one place that's still "canned" in shape (keyword
 * routing rather than free-form understanding), but the content it returns
 * is now built from the same real numbers, not invented text.
 */

import type { Alert, DailySummary, Insight, Task } from "@/types";

interface DashboardSummary {
  alerts: Alert[];
  dailySummary: DailySummary;
  aiTasks: Task[];
}

let summaryCache: Promise<DashboardSummary> | null = null;

async function fetchSummary(): Promise<DashboardSummary> {
  const res = await fetch("/api/dashboard/summary");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to load dashboard summary (${res.status})`);
  }
  const body = await res.json();
  return {
    alerts: (body.alerts ?? []) as Alert[],
    dailySummary: body.dailySummary as DailySummary,
    aiTasks: (body.aiTasks ?? []) as Task[],
  };
}

function getSummary(): Promise<DashboardSummary> {
  if (!summaryCache) summaryCache = fetchSummary();
  return summaryCache;
}

/** Returns all current alerts across all clients. */
export async function getAlerts(): Promise<Alert[]> {
  return (await getSummary()).alerts;
}

/** Returns insights + suggested actions for a specific client. */
export async function getInsightsForClient(clientId: string): Promise<Insight[]> {
  const { insights } = await getClientInsightsAndActions(clientId);
  return insights;
}

/** Returns insights and suggested actions together (InsightsList needs both). */
export async function getClientInsightsAndActions(
  clientId: string
): Promise<{ insights: Insight[]; suggestedActions: string[] }> {
  const res = await fetch(`/api/clients/${clientId}/insights`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to load insights (${res.status})`);
  }
  const body = await res.json();
  return {
    insights: (body.insights ?? []) as Insight[],
    suggestedActions: (body.suggestedActions ?? []) as string[],
  };
}

/** Returns today's daily summary, computed from real alerts across all clients. */
export async function getDailySummary(): Promise<DailySummary> {
  return (await getSummary()).dailySummary;
}

/** Returns suggested tasks generated from triggered alerts. */
export async function getAISuggestedTasks(): Promise<Task[]> {
  return (await getSummary()).aiTasks;
}

/**
 * Answers a natural-language question using the real alerts/daily-summary
 * data already computed for today — keyword-routed (not a real NLU/LLM),
 * but every fact in the response is real.
 */
export async function askAssistant(message: string): Promise<string> {
  const { dailySummary, alerts } = await getSummary();
  const lower = message.toLowerCase();

  const priorityNames = dailySummary.priorityClientIds;
  const critical = alerts.filter((a) => a.severity === "critical");
  const warning = alerts.filter((a) => a.severity === "warning");

  if (lower.includes("focus") || lower.includes("today")) {
    if (priorityNames.length === 0) return "Nothing urgent today — no clients are currently flagged for action or watch.";
    return `${dailySummary.summaryText} Start with ${priorityNames[0]}.`;
  }

  if (lower.includes("urgent") || lower.includes("critical")) {
    if (critical.length === 0) return "No critical alerts right now.";
    return `${critical.length} critical item${critical.length > 1 ? "s" : ""}: ${critical.map((a) => a.message).join("; ")}.`;
  }

  if (lower.includes("wait") || lower.includes("can hold")) {
    const normal = dailySummary.priorityClientIds.length === 0;
    if (normal) return "Everything is currently stable — nothing is flagged as urgent.";
    return `Anything not listed under today's priorities can wait. Currently watching: ${warning.map((a) => a.clientId).join(", ") || "none"}.`;
  }

  const mentioned = alerts.find((a) => lower.includes(a.clientId.toLowerCase()));
  if (mentioned) {
    return `${mentioned.message}.`;
  }

  return dailySummary.summaryText || "No active alerts — all clients are stable.";
}
