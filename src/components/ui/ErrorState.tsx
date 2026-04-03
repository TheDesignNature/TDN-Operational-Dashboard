import { cn } from "@/lib/cn";

interface ErrorStateProps {
  title?: string;
  message: string;
  retry?: () => void;
  className?: string;
  size?: "sm" | "md";
}

export function ErrorState({
  title = "Something went wrong",
  message,
  retry,
  className,
  size = "md",
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "md" ? "py-12 px-6" : "py-6 px-4",
        className
      )}
    >
      <div className="mb-4 text-status-action/30">
        <svg
          width={size === "md" ? 40 : 32}
          height={size === "md" ? 40 : 32}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="font-medium text-teal/60 mb-1">{title}</p>
      <p className="text-sm text-teal/40 max-w-sm leading-relaxed">{message}</p>
      {retry && (
        <button onClick={retry} className="mt-4 btn-secondary text-sm">
          Try again
        </button>
      )}
    </div>
  );
}

// ── Pre-built error states ────────────────────────────────────

export function SupabaseError({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <ErrorState
      title="Database error"
      message={`Could not load data from Supabase. ${message}`}
      retry={retry}
    />
  );
}

export function NetworkError({ retry }: { retry?: () => void }) {
  return (
    <ErrorState
      title="Connection problem"
      message="Check your internet connection and try again."
      retry={retry}
    />
  );
}
