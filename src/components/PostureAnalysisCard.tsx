import { motion } from "framer-motion";
import { PostureAnalysis } from "@/lib/posture";
import { Activity, AlertTriangle, CheckCircle, TrendingDown, TrendingUp } from "lucide-react";

interface PostureAnalysisCardProps {
  analysis: PostureAnalysis | null;
}

function getStatusIcon(status: string) {
  switch (status) {
    case "balanced": return <CheckCircle className="w-5 h-5 text-glow-good" />;
    case "slouch-risk": return <AlertTriangle className="w-5 h-5 text-glow-warning" />;
    case "leaning-forward": return <TrendingDown className="w-5 h-5 text-glow-warning" />;
    case "leaning-backward": return <TrendingUp className="w-5 h-5 text-glow-warning" />;
    default: return <Activity className="w-5 h-5 text-primary" />;
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-glow-good";
  if (score >= 50) return "text-glow-warning";
  return "text-glow-danger";
}

function ScoreRing({ score, label, size = 80 }: { score: number; label: string; size?: number }) {
  const radius = size / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
          <motion.circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={score >= 80 ? "hsl(var(--glow-good))" : score >= 50 ? "hsl(var(--glow-warning))" : "hsl(var(--glow-danger))"}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold font-mono ${getScoreColor(score)}`}>{score}</span>
      </div>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}

export default function PostureAnalysisCard({ analysis }: PostureAnalysisCardProps) {
  if (!analysis) return null;

  return (
    <div className="glass p-6 space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Posture Analysis</h3>

      <div className="flex items-center gap-3">
        {getStatusIcon(analysis.status)}
        <div>
          <p className="font-semibold text-foreground">{analysis.label}</p>
          <p className="text-xs text-muted-foreground">{analysis.explanation}</p>
        </div>
      </div>

      <div className="flex justify-around pt-2">
        <ScoreRing score={analysis.score} label="Posture" />
        <ScoreRing score={analysis.balanceScore} label="L-R Balance" />
        <ScoreRing score={analysis.fbBalanceScore} label="F-B Stability" />
      </div>
    </div>
  );
}
