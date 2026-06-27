import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { CLIENT_UUIDS, BOOKING_CLIENTS, CLIENT_INDUSTRIES } from "@/lib/clientIds";
import { getLatestClientSnapshot } from "@/lib/clientSnapshot";
import { computeClientInsights } from "@/lib/insightsEngine";
import type { Alert, Client, DailySummary, Insight, Task } from "@/types";

export const runtime = "nodejs";

/**
 * Replaces the old openClawService mock data (MOCK_ALERTS, MOCK_INSIGHTS,
 * MOCK_AI_TASKS) with figures computed live from report_monthly_comparison
 * for every client. One route powers getAllClients(), getAlerts(),
 * getDailySummary() and getAISuggestedTasks() — they all need the same
 * per-client computation, so we do it once here and let each service pick
 * out the slice it needs.
 */

const SEVERITY_RANK: Record<string, number> = { critical: 2, warning: 1 };

const METRIC_TASK_TEMPLATE: Record<string, (clientName: string) => { title: string; minutes: number }> = {
  enquiry: (name) => ({ title: `Investigate ${name} enquiry drop`, minutes: 45 }),
  booking: (name) => ({ title: `Investigate ${name} booking drop`, minutes: 45 }),
  cost_per_lead: (name) => ({ title: `Review ${name} cost efficiency`, minutes: 30 }),
  website_conversion_rate: (name) => ({ title: `Check ${name} landing pages for conversion friction`, minutes: 30 }),
  spend: (name) => ({ title: `Investigate ${name} spend delivery`, minutes: 60 }),
};

export async function GET() {
  const supabase = getSupabaseClient();

  const { data: clientRows, error } = await supabase
    .from("clients")
    .select("id, name, industry");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const nameByUuid = new Map<string, { name: string; industry: string | null }>();
  for (const row of clientRows ?? []) {
    nameByUuid.set(row.id as string, { name: row.name as string, industry: row.industry as string | null });
  }

  const slugs = Object.keys(CLIENT_UUIDS);
  const now = new Date().toISOString();

  const clients: Client[] = [];
  const allAlerts: Alert[] = [];
  const allInsights: Insight[] = []; // not returned directly, but useful if extended later
  const aiTasks: Task[] = [];

  let taskCounter = 0;

  await Promise.all(
    slugs.map(async (slug) => {
      const uuid = CLIENT_UUIDS[slug];
      const isBooking = BOOKING_CLIENTS.has(slug);
      const meta = nameByUuid.get(uuid);
      const clientName = meta?.name ?? slug;

      const snapshot = await getLatestClientSnapshot(supabase, uuid);

      const result = computeClientInsights(
        clientName,
        isBooking,
        snapshot ?? {
          spend: 0,
          traffic: 0,
          value: 0,
          cpl: null,
          wcr: null,
          momSpendPct: null,
          momTrafficPct: null,
          momValuePct: null,
          momCplPct: null,
          momWcrPct: null,
        }
      );

      clients.push({
        id: slug,
        name: clientName,
        industry: meta?.industry ?? CLIENT_INDUSTRIES[slug] ?? "",
        status: result.status,
        statusMessage: result.statusMessage,
        summaryMetrics: result.summaryMetrics,
        lastUpdated: now,
      });

      result.alerts.forEach((a, i) => {
        const alert: Alert = { ...a, id: `${slug}-alert-${i}`, clientId: slug, createdAt: now };
        allAlerts.push(alert);

        const template = METRIC_TASK_TEMPLATE[a.metric];
        if (template) {
          taskCounter += 1;
          const { title, minutes } = template(clientName);
          const critical = a.severity === "critical";
          const due = new Date();
          if (!critical) due.setDate(due.getDate() + 2);
          aiTasks.push({
            id: `ai-${slug}-${a.metric}`,
            title,
            clientId: slug,
            priority: critical ? "high" : "medium",
            status: "todo",
            dueDate: due.toISOString().split("T")[0],
            source: "ai",
            notes: a.message,
            estimatedMinutes: minutes,
            createdAt: now,
            order: taskCounter,
          });
        }
      });

      result.insights.forEach((ins, i) => {
        allInsights.push({ ...ins, id: `${slug}-insight-${i}`, clientId: slug, createdAt: now });
      });
    })
  );

  allAlerts.sort((a, b) => {
    const rankDiff = (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0);
    if (rankDiff !== 0) return rankDiff;
    return Math.abs(b.deltaPercent) - Math.abs(a.deltaPercent);
  });

  const actionClients = clients.filter((c) => c.status === "action");
  const watchClients = clients.filter((c) => c.status === "watch");
  const strongClients = clients.filter(
    (c) => c.status === "normal" && allInsights.some((i) => i.clientId === c.id && i.title === "Above-target performance")
  );

  const priorityClientIds =
    actionClients.length > 0 ? actionClients.map((c) => c.id) : watchClients.map((c) => c.id);

  const summaryParts: string[] = [];
  if (actionClients.length > 0) {
    summaryParts.push(
      `${actionClients.length} client${actionClients.length > 1 ? "s" : ""} need${actionClients.length > 1 ? "" : "s"} attention today: ${actionClients.map((c) => c.name).join(", ")}.`
    );
  } else {
    summaryParts.push("No clients need urgent attention today.");
  }
  if (watchClients.length > 0) {
    summaryParts.push(`${watchClients.map((c) => c.name).join(", ")} worth monitoring but no action needed yet.`);
  }
  if (strongClients.length > 0) {
    summaryParts.push(`${strongClients.map((c) => c.name).join(", ")} performing above target — consider a budget increase proposal.`);
  }

  const recommendedTaskIds = aiTasks
    .filter((t) => priorityClientIds.includes(t.clientId ?? ""))
    .slice(0, 3)
    .map((t) => t.id);

  const dailySummary: DailySummary = {
    generatedAt: now,
    summaryText: summaryParts.join(" "),
    priorityClientIds,
    recommendedTaskIds,
    topAlerts: allAlerts.slice(0, 3),
  };

  return NextResponse.json({ clients, alerts: allAlerts, dailySummary, aiTasks });
}
