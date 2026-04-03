import { cn } from "@/lib/cn";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const sizeMap = {
  sm: "w-4 h-4 border-[1.5px]",
  md: "w-6 h-6 border-2",
  lg: "w-8 h-8 border-2",
};

export function LoadingSpinner({ size = "md", className, label }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div
        className={cn(
          "rounded-full border-sand border-t-teal animate-spin",
          sizeMap[size]
        )}
        role="status"
        aria-label={label ?? "Loading"}
      />
      {label && (
        <p className="text-sm text-teal/40">{label}</p>
      )}
    </div>
  );
}

export function PageLoader({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner size="lg" label={label} />
    </div>
  );
}
