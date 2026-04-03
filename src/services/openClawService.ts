/**
 * OpenClaw Service
 *
 * This is the AI integration layer. Currently returns mock data.
 *
 * TO CONNECT THE REAL OPENCLCAW AGENT:
 * 1. Add OPENCLAW_API_URL and OPENCLAW_API_KEY to your env vars
 * 2. Replace each mock function below with a real fetch() call
 *    to the corresponding OpenClaw endpoint
 * 3. The return types are already defined in src/types/index.ts —
 *    your real API responses should match those shapes
 *
 * The rest of the app consumes these functions and doesn't care
 * whether the data is mock or real.
 */

import type { Alert, DailySummary, Insight, Task } from "@/types";

// ── Simulated network delay (remove when using real API) ──────
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Mock data ──────────────────────────────────────────────────

const MOCK_ALERTS: Alert[] = [
  {
    id: "alert-1",
    clientId: "powershift",
    severity: "critical",
    message: "Enquiries dropped 28% month-on-month",
    metric: "enquiries",
    deltaPercent: -28,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "alert-2",
    clientId: "kkcs",
    severity: "warning",
    message: "Traffic up 18% but conversions remained flat",
    metric: "conversion_rate",
    deltaPercent: -2,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "alert-3",
    clientId: "caloundra-mazda",
    severity: "warning",
    message: "Cost per lead increased 22% — campaign efficiency falling",
    metric: "cost_per_lead",
    deltaPercent: 22,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "alert-4",
    clientId: "foundation-home",
    severity: "critical",
    message: "Spend tracking 35% under budget — delivery issue likely",
    metric: "spend",
    deltaPercent: -35,
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
];

const MOCK_INSIGHTS: Record<string, Insight[]> = {
  powershift: [
    {
      id: "ins-ps-1",
      clientId: "powershift",
      severity: "critical",
      title: "Enquiry volume falling",
      message:
        "Enquiries are down 28% compared to last month. The drop appears across all campaigns — not isolated to one ad group. Review landing page load speeds and search term match types before adjusting bids.",
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "ins-ps-2",
      clientId: "powershift",
      severity: "warning",
      title: "Cost efficiency worsening",
      message:
        "CPL has risen 31% while spend stayed flat. This suggests the audience is becoming harder to reach at current bids, or that competitor activity has increased. Check auction insights.",
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "ins-ps-3",
      clientId: "powershift",
      severity: "info",
      title: "Traffic holding steady",
      message:
        "Despite the drop in enquiries, total website traffic is only down 4%. The conversion rate drop is the primary issue — the ads are delivering clicks, but the site is not converting them.",
      createdAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    },
  ],
  kkcs: [
    {
      id: "ins-kkcs-1",
      clientId: "kkcs",
      severity: "warning",
      title: "Conversion rate lagging traffic growth",
      message:
        "Traffic grew 18% this month but the conversion rate stayed flat at 2.1%. If this trend continues, the extra traffic spend will not deliver ROI. Check the most-visited landing pages for friction points.",
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
  ],
  "caloundra-city-auto": [
    {
      id: "ins-cca-1",
      clientId: "caloundra-city-auto",
      severity: "info",
      title: "Steady performance this month",
      message:
        "All core metrics are within 5% of last month. No immediate action required. CPL is at a 3-month low — worth noting in the next client report.",
      createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    },
  ],
  "caloundra-mazda": [
    {
      id: "ins-cm-1",
      clientId: "caloundra-mazda",
      severity: "warning",
      title: "CPL trending upward",
      message:
        "Cost per lead has increased for the second month in a row. At this rate it will breach the agreed target of $120 by next month. Review campaign structure and negative keywords.",
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    },
  ],
  "foundation-home": [
    {
      id: "ins-fh-1",
      clientId: "foundation-home",
      severity: "critical",
      title: "Spend delivery critically low",
      message:
        "Only 65% of the monthly budget has been delivered with 8 days remaining. This is a structural campaign issue — likely audience exhaustion or bid cap too low. Needs immediate attention.",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
  ],
  "sell-a-car": [
    {
      id: "ins-sc-1",
      clientId: "sell-a-car",
      severity: "info",
      title: "Above-target performance",
      message:
        "Enquiries are 12% above target with CPL 8% below target. Performance is strong. Consider a budget increase proposal for next month.",
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    },
  ],
  "study-hub": [
    {
      id: "ins-sh-1",
      clientId: "study-hub",
      severity: "info",
      title: "Early campaign data only",
      message:
        "Campaign launched 12 days ago. Too early to draw conclusions — let it run until the end of the month before optimising.",
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

const MOCK_AI_TASKS: Task[] = [
  {
    id: "ai-task-1",
    title: "Audit Powershift landing page conversion points",
    clientId: "powershift",
    priority: "high",
    status: "todo",
    dueDate: new Date().toISOString().split("T")[0],
    source: "ai",
    notes: "Enquiries dropped 28% — conversion rate issue, not traffic issue. Check form load speed, CTA placement, and mobile view.",
    estimatedMinutes: 45,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    order: 1,
  },
  {
    id: "ai-task-2",
    title: "Review Powershift search term report",
    clientId: "powershift",
    priority: "high",
    status: "todo",
    dueDate: new Date().toISOString().split("T")[0],
    source: "ai",
    notes: "Check for broad match bleed and new irrelevant search terms contributing to wasted spend.",
    estimatedMinutes: 30,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    order: 2,
  },
  {
    id: "ai-task-3",
    title: "Investigate Foundation Home Mods spend delivery",
    clientId: "foundation-home",
    priority: "high",
    status: "todo",
    dueDate: new Date().toISOString().split("T")[0],
    source: "ai",
    notes: "Only 65% of budget delivered. Check bid strategy, audience size, ad approval status, and budget caps.",
    estimatedMinutes: 60,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    order: 3,
  },
  {
    id: "ai-task-4",
    title: "Check KKCS landing pages for conversion friction",
    clientId: "kkcs",
    priority: "medium",
    status: "todo",
    dueDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      return d.toISOString().split("T")[0];
    })(),
    source: "ai",
    notes: "Traffic up 18% but conversion flat. Review the highest-traffic landing pages.",
    estimatedMinutes: 30,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    order: 4,
  },
  {
    id: "ai-task-5",
    title: "Prepare Sell a Car budget increase proposal",
    clientId: "sell-a-car",
    priority: "medium",
    status: "todo",
    dueDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 5);
      return d.toISOString().split("T")[0];
    })(),
    source: "ai",
    notes: "Performance is above target — good moment to propose a 15–20% budget increase.",
    estimatedMinutes: 20,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    order: 5,
  },
];

// ── Service functions ─────────────────────────────────────────

/**
 * Returns all current alerts across all clients.
 * Future: GET /openclaw/alerts
 */
export async function getAlerts(): Promise<Alert[]> {
  await delay(300);
  return MOCK_ALERTS;
}

/**
 * Returns insights for a specific client.
 * Future: GET /openclaw/insights?clientId=xxx
 */
export async function getInsightsForClient(clientId: string): Promise<Insight[]> {
  await delay(200);
  return MOCK_INSIGHTS[clientId] ?? [];
}

/**
 * Returns today's AI-generated daily summary.
 * Future: GET /openclaw/daily-summary
 */
export async function getDailySummary(): Promise<DailySummary> {
  await delay(400);
  return {
    generatedAt: new Date().toISOString(),
    summaryText:
      "Two clients need immediate attention today. Powershift is showing a significant conversion rate drop that needs investigation before this week's report. Foundation Home Mods has a spend delivery issue that could result in under-delivery for the month. KKCS and Caloundra Mazda need monitoring but no action yet. Sell a Car is performing well — consider a budget proposal.",
    priorityClientIds: ["powershift", "foundation-home"],
    recommendedTaskIds: ["ai-task-1", "ai-task-2", "ai-task-3"],
    topAlerts: MOCK_ALERTS.slice(0, 3),
  };
}

/**
 * Returns AI-generated suggested tasks.
 * Future: GET /openclaw/suggested-tasks
 */
export async function getAISuggestedTasks(): Promise<Task[]> {
  await delay(250);
  return MOCK_AI_TASKS;
}

/**
 * Sends a natural-language question to the AI assistant.
 * Currently returns a canned response based on the query.
 * Future: POST /openclaw/chat { message }
 */
export async function askAssistant(message: string): Promise<string> {
  await delay(800);

  const lower = message.toLowerCase();

  if (lower.includes("focus") || lower.includes("today")) {
    return "Your top priority today is Powershift — the enquiry drop needs investigation before it shows up in the client report. After that, check Foundation Home Mods spend delivery. KKCS can wait until tomorrow.";
  }
  if (lower.includes("urgent") || lower.includes("critical")) {
    return "Two urgent items: Powershift has a 28% enquiry drop that needs a landing page and search term audit now. Foundation Home Mods has only delivered 65% of their monthly budget — likely a structural campaign issue.";
  }
  if (lower.includes("wait") || lower.includes("can hold")) {
    return "Caloundra City Auto is stable and can wait. Study Hub is too early in its campaign to optimise. Sell a Car is performing above target — a budget proposal would be nice but it's not urgent.";
  }
  if (lower.includes("powershift")) {
    return "Powershift needs attention. Enquiries are down 28% but traffic is only down 4% — this is a conversion problem, not a traffic problem. Start with the landing page and form, then check the search term report for audience quality issues.";
  }

  return "Based on current data, your focus should be Powershift (enquiry drop) and Foundation Home Mods (spend delivery issue). Both need action today. Everything else is monitoring only.";
}
