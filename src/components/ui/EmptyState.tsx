import { cn } from "@/lib/cn";

interface EmptyStateProps {
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
  className?: string;
  size?: "sm" | "md";
}

export function EmptyState({
  title,
  message,
  action,
  icon,
  className,
  size = "md",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "md" ? "py-12 px-6" : "py-8 px-4",
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-teal/20">{icon}</div>
      )}
      <p
        className={cn(
          "font-medium text-teal/50",
          size === "md" ? "text-base mb-1" : "text-sm mb-1"
        )}
      >
        {title}
      </p>
      <p className="text-sm text-teal/35 max-w-xs leading-relaxed">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 btn-secondary text-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// ── Pre-built empty states for common scenarios ──────────────

export function NoTasksEmpty({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      title="No tasks here"
      message="This bucket is clear. Add a task manually or wait for AI suggestions to appear."
      action={onAdd ? { label: "Add a task", onClick: onAdd } : undefined}
      icon={<CheckIcon />}
    />
  );
}

export function NoDataEmpty() {
  return (
    <EmptyState
      title="No data yet"
      message="Data will appear here once connected to Supabase and the first reporting period has been processed."
      icon={<ChartIcon />}
    />
  );
}

export function NoClientsEmpty() {
  return (
    <EmptyState
      title="No clients found"
      message="No client data is available. Check your Supabase connection and ensure the clients table is populated."
      icon={<UserIcon />}
    />
  );
}

// Simple inline SVG icons — no external dependency
function CheckIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
