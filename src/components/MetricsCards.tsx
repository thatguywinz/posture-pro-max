import { PressureData, PostureAnalysis } from "@/lib/posture";

interface MetricsCardsProps {
  data: PressureData | null;
  analysis: PostureAnalysis | null;
}

function MetricCard({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: boolean }) {
  return (
    <div className="glass p-4 flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-mono font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

export default function MetricsCards({ data, analysis }: MetricsCardsProps) {
  const d = data || { front: 0, back: 0, left: 0, right: 0, timestamp: 0 };
  const total = d.front + d.back + d.left + d.right;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      <MetricCard label="Front" value={d.front.toFixed(2)} unit="V" />
      <MetricCard label="Back" value={d.back.toFixed(2)} unit="V" />
      <MetricCard label="Left" value={d.left.toFixed(2)} unit="V" />
      <MetricCard label="Right" value={d.right.toFixed(2)} unit="V" />
      <MetricCard label="Total Pressure" value={total.toFixed(2)} unit="V" accent />
      <MetricCard label="F/B Imbalance" value={analysis ? (analysis.fbImbalance * 100).toFixed(0) : "0"} unit="%" />
      <MetricCard label="L/R Imbalance" value={analysis ? (analysis.lrImbalance * 100).toFixed(0) : "0"} unit="%" />
      <MetricCard label="Posture Score" value={analysis ? String(analysis.score) : "—"} unit="/100" accent />
    </div>
  );
}
