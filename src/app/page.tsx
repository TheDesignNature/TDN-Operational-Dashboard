"use client";

import { useState } from "react";
import { DailyBriefing } from "@/components/dashboard/DailyBriefing";
import { ClientStatusGrid } from "@/components/dashboard/ClientStatusGrid";
import { FocusModeToggle } from "@/components/dashboard/FocusModeToggle";
import type { ViewMode } from "@/types";

export default function DashboardPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("detailed");

  return (
    <div className="max-w-6xl mx-auto">
      {/* Daily briefing — the cockpit panel */}
      <DailyBriefing />

      {/* Client status section */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-heading text-base font-semibold text-teal tracking-wide">
            Client status
          </h2>
          <p className="text-xs text-teal/40 mt-0.5">
            Click any client for full performance detail
          </p>
        </div>
        <FocusModeToggle mode={viewMode} onChange={setViewMode} />
      </div>

      <ClientStatusGrid viewMode={viewMode} />
    </div>
  );
}
