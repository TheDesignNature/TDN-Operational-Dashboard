"use client";

import { cn } from "@/lib/cn";
import type { ViewMode } from "@/types";

interface FocusModeToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function FocusModeToggle({ mode, onChange }: FocusModeToggleProps) {
  return (
    <div
      className="inline-flex items-center rounded-lg border border-sand/60 bg-white p-0.5"
      role="radiogroup"
      aria-label="View mode"
    >
      {(["simple", "detailed"] as ViewMode[]).map((option) => (
        <button
          key={option}
          role="radio"
          aria-checked={mode === option}
          onClick={() => onChange(option)}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 capitalize",
            mode === option
              ? "bg-teal text-white shadow-sm"
              : "text-teal/50 hover:text-teal hover:bg-stone"
          )}
        >
          {option === "simple" ? "Focus" : "Detailed"}
        </button>
      ))}
    </div>
  );
}
