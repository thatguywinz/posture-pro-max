import { SessionStats } from "@/lib/posture";
import { Clock, Target, AlertTriangle, Zap } from "lucide-react";

interface SessionInsightsProps {
  session: SessionStats;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export default function SessionInsights({ session }: SessionInsightsProps) {
  const balancedPct = session.totalTime > 0 ? Math.round((session.balancedTime / session.totalTime) * 100) : 0;

  const stats = [
    { icon: <Clock className="w-4 h-4 text-primary" />, label: "Session Duration", value: formatDuration(session.totalTime) },
    { icon: <Target className="w-4 h-4 text-glow-good" />, label: "Time Balanced", value: `${balancedPct}%` },
    { icon: <AlertTriangle className="w-4 h-4 text-glow-warning" />, label: "Warnings", value: String(session.warningCount) },
    { icon: <Zap className="w-4 h-4 text-primary" />, label: "Best Streak", value: formatDuration(session.longestBalancedStreak) },
  ];

  return (
    <div className="glass p-6 space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Session Insights</h3>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3 bg-secondary/40 rounded-lg p-3">
            {s.icon}
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="font-mono font-semibold text-foreground">{s.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
