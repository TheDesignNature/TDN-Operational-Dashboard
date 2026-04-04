/**
 * Formatting utilities used throughout the app.
 * All currency is AUD. All dates are displayed in AU locale.
 */

// ── Currency ──────────────────────────────────────────────────

export function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}m`;
  }
  if (value >= 10_000) {
    return `$${Math.round(value / 1_000)}k`;
  }
  // Show cents for small values like CPC
  if (value < 10) {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ── Percentages ───────────────────────────────────────────────

export function formatPercent(value: number, decimals = 1): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

export function formatPercentAbsolute(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/** Returns a signed delta string like "+12%" or "-8%" */
export function formatDelta(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return formatPercent(value);
}

// ── Dates ─────────────────────────────────────────────────────

/**
 * Converts "2024-10" to "Oct 2024"
 */
export function formatMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-AU", { month: "short", year: "numeric" });
}

/**
 * Returns a short relative label like "Today", "Yesterday", or "12 Jan"
 */
export function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const today = new Date();
  const diffDays = Math.floor(
    (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

/**
 * Formats a due date for task display.
 * Returns "Overdue", "Due today", "Due tomorrow", or a short date.
 */
export function formatDueDate(isoDate: string | null): string {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diffDays = Math.floor(
    (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 0) return "Overdue";
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  return `Due ${date.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`;
}

export function isDueUrgent(isoDate: string | null): boolean {
  if (!isoDate) return false;
  const date = new Date(isoDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date.getTime() <= today.getTime();
}

// ── Numbers ───────────────────────────────────────────────────

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-AU").format(value);
}

export function formatEffort(minutes: number | null): string {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
