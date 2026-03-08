import { PostureAnalysis } from "@/lib/posture";
import { Lightbulb } from "lucide-react";

interface RecommendationsPanelProps {
  analysis: PostureAnalysis | null;
}

export default function RecommendationsPanel({ analysis }: RecommendationsPanelProps) {
  if (!analysis || analysis.recommendations.length === 0) return null;

  return (
    <div className="glass p-6 space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-primary" />
        Recommendations
      </h3>
      <ul className="space-y-2">
        {analysis.recommendations.map((tip, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-secondary-foreground">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}
