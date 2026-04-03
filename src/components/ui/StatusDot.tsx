import type { ClientStatus } from "@/types";
import { getStatusStyle } from "@/lib/statusHelpers";
import { cn } from "@/lib/cn";

interface StatusDotProps {
  status: ClientStatus;
  pulse?: boolean;
  size?: "sm" | "md";
}

export function StatusDot({ status, pulse = false, size = "md" }: StatusDotProps) {
  const { dotClass } = getStatusStyle(status);
  const sizeClass = size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2";

  return (
    <span className="relative inline-flex">
      {pulse && status !== "normal" && (
        <span
          className={cn(
            "absolute inline-flex rounded-full opacity-60 animate-ping",
            sizeClass,
            dotClass
          )}
        />
      )}
      <span className={cn("relative inline-flex rounded-full", sizeClass, dotClass)} />
    </span>
  );
}

interface StatusBadgeProps {
  status: ClientStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, badgeClass } = getStatusStyle(status);
  return (
    <span className={cn("status-badge", badgeClass)}>
      <StatusDot status={status} size="sm" />
      {label}
    </span>
  );
}
