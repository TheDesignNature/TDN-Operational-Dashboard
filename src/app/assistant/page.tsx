import { DailySummaryCard } from "@/components/assistant/DailySummaryCard";
import { RecommendedActions } from "@/components/assistant/RecommendedActions";
import { AssistantInput } from "@/components/assistant/AssistantInput";

export default function AssistantPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <DailySummaryCard />
      <RecommendedActions />
      <AssistantInput />
    </div>
  );
}
