// ─────────────────────────────────────────────────────────────
// Domain types for Marketing Engine
// These are the shapes that flow through the whole app.
// OpenClaw AI will eventually produce Insight, Alert, and
// DailySummary objects that match these exact interfaces.
// ─────────────────────────────────────────────────────────────

// ── Client ───────────────────────────────────────────────────

export type ClientStatus = "normal" | "watch" | "action";

export interface Client {
  id: string;
  name: string;
  industry: string;
  status: ClientStatus;
  /** Short human-readable message shown on the client card */
  statusMessage: string;
  /** Key metrics shown on the dashboard card — up to 4 */
  summaryMetrics: SummaryMetric[];
  lastUpdated: string; // ISO date string
}

export interface SummaryMetric {
  label: string;
  value: string;
  /** Optional MoM delta as a percentage, e.g. -12 means -12% */
  delta?: number;
}

// ── Powershift reporting (real Supabase data) ─────────────────

/** Matches the shape of the powershift_monthly_report Supabase view */
export interface PowershiftMonthlyRow {
  metric_date: string;                      // e.g. "2024-10-01"
  month_label: string;                      // e.g. "Oct 2024"
  spend: number;
  traffic: number;
  enquiries: number;
  cost_per_lead: number;
  website_conversion_rate_pct: number;      // was: website_conversion_rate
  mom_spend_pct: number | null;
  mom_traffic_pct: number | null;
  mom_enquiries_pct: number | null;
  mom_cpl_pct: number | null;
  mom_website_conversion_rate_pct: number | null;  // was: mom_wcr_pct
}

// ── Tasks ─────────────────────────────────────────────────────

export type TaskPriority = "high" | "medium" | "low";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskSource = "manual" | "ai";
export type TaskBucket = "today" | "week" | "backlog";

export interface Task {
  id: string;
  title: string;
  clientId: string | null; // null = general / not client-specific
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null; // ISO date string
  source: TaskSource;
  notes: string | null;
  estimatedMinutes: number | null;
  createdAt: string;
  order: number; // for drag-and-drop / up-down ordering
}

// ── AI / OpenClaw output shapes ───────────────────────────────
// These interfaces define exactly what we expect from the AI layer.
// Mock data currently satisfies these. When OpenClaw is connected,
// replace the mock functions in services/openClawService.ts with
// real API calls that return the same shapes.

export interface Insight {
  id: string;
  clientId: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  createdAt: string;
}

export interface Alert {
  id: string;
  clientId: string;
  severity: "warning" | "critical";
  message: string;
  /** Which metric triggered the alert */
  metric: string;
  /** Percentage change that triggered it, e.g. -25 */
  deltaPercent: number;
  createdAt: string;
}

export interface DailySummary {
  generatedAt: string;
  summaryText: string;
  /** Client IDs that need attention today */
  priorityClientIds: string[];
  /** Pre-selected task IDs to surface in focus mode */
  recommendedTaskIds: string[];
  /** Top 2–3 anomaly alerts for the day */
  topAlerts: Alert[];
}

// ── UI state helpers ──────────────────────────────────────────

export type ViewMode = "simple" | "detailed";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}
