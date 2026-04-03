import type { ClientStatus, TaskPriority } from "@/types";

// ── Client status ─────────────────────────────────────────────

export interface StatusStyle {
  label: string;
  dotClass: string;
  badgeClass: string;
  borderClass: string;
}

const CLIENT_STATUS_STYLES: Record<ClientStatus, StatusStyle> = {
  normal: {
    label: "Normal",
    dotClass: "bg-status-normal",
    badgeClass: "bg-status-normal-bg text-status-normal border-status-normal-border",
    borderClass: "border-status-normal-border",
  },
  watch: {
    label: "Watch",
    dotClass: "bg-status-watch",
    badgeClass: "bg-status-watch-bg text-status-watch border-status-watch-border",
    borderClass: "border-status-watch-border",
  },
  action: {
    label: "Action needed",
    dotClass: "bg-status-action",
    badgeClass: "bg-status-action-bg text-status-action border-status-action-border",
    borderClass: "border-status-action-border",
  },
};

export function getStatusStyle(status: ClientStatus): StatusStyle {
  return CLIENT_STATUS_STYLES[status];
}

// ── Task priority ─────────────────────────────────────────────

export interface PriorityStyle {
  label: string;
  dotClass: string;
  textClass: string;
}

const TASK_PRIORITY_STYLES: Record<TaskPriority, PriorityStyle> = {
  high: {
    label: "High",
    dotClass: "bg-status-action",
    textClass: "text-status-action",
  },
  medium: {
    label: "Medium",
    dotClass: "bg-status-watch",
    textClass: "text-status-watch",
  },
  low: {
    label: "Low",
    dotClass: "bg-teal-light",
    textClass: "text-teal-light",
  },
};

export function getPriorityStyle(priority: TaskPriority): PriorityStyle {
  return TASK_PRIORITY_STYLES[priority];
}

// ── Delta colouring ───────────────────────────────────────────

/**
 * Returns a Tailwind text class for a metric delta.
 * Pass `invertGood` as true for metrics where a drop is good
 * (e.g. cost per lead — lower is better).
 */
export function getDeltaClass(
  delta: number | null | undefined,
  invertGood = false
): string {
  if (delta === null || delta === undefined) return "text-teal-light";
  const positive = delta > 0;
  const good = invertGood ? !positive : positive;
  if (Math.abs(delta) < 3) return "text-teal-light"; // negligible
  return good ? "text-status-normal" : "text-status-action";
}

// ── Severity ──────────────────────────────────────────────────

export function getSeverityClass(severity: "info" | "warning" | "critical"): string {
  return {
    info: "text-teal border-teal/20 bg-teal-pale",
    warning: "text-status-watch border-status-watch-border bg-status-watch-bg",
    critical: "text-status-action border-status-action-border bg-status-action-bg",
  }[severity];
}
