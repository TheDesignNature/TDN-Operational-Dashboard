import { cn } from "@/lib/cn";

type BadgeVariant =
  | "high"
  | "medium"
  | "low"
  | "ai"
  | "manual"
  | "info"
  | "warning"
  | "critical"
  | "neutral";

const variantClasses: Record<BadgeVariant, string> = {
  high: "bg-status-action-bg text-status-action border-status-action-border",
  medium: "bg-status-watch-bg text-status-watch border-status-watch-border",
  low: "bg-teal-pale text-teal-light border-teal/10",
  ai: "bg-blue-pale text-blue-dark border-blue/20",
  manual: "bg-sand-pale text-teal/60 border-sand/60",
  info: "bg-teal-pale text-teal border-teal/20",
  warning: "bg-status-watch-bg text-status-watch border-status-watch-border",
  critical: "bg-status-action-bg text-status-action border-status-action-border",
  neutral: "bg-stone text-teal/50 border-sand/60",
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
