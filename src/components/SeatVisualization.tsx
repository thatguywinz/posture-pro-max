import { motion } from "framer-motion";
import { PressureData, PostureAnalysis } from "@/lib/posture";

interface SeatVisualizationProps {
  data: PressureData | null;
  analysis?: PostureAnalysis | null;
}

function getIntensity(value: number): number {
  return Math.min(1, Math.max(0, value / 3.0));
}

type QuadrantSide = "front" | "back" | "left" | "right";

/** Detect leaning by finding the highest voltage sensor (~5V = being leaned on)
 *  while its opposite is dropping/low (~1V = pressure released). */
function detectLeaningSide(data: PressureData): QuadrantSide | null {
  const HIGH_V_THRESHOLD = 3.5;
  const MIN_DIFF = 1.5;

  const sensors: { side: QuadrantSide; value: number; opposite: number }[] = [
    { side: "front", value: data.front, opposite: data.back },
    { side: "back", value: data.back, opposite: data.front },
    { side: "left", value: data.left, opposite: data.right },
    { side: "right", value: data.right, opposite: data.left },
  ];

  const sorted = [...sensors].sort((a, b) => b.value - a.value);
  const peak = sorted[0];

  if (peak.value >= HIGH_V_THRESHOLD && (peak.value - peak.opposite) >= MIN_DIFF) {
    return peak.side;
  }

  return null;
}

function getColor(intensity: number, isLeaning: boolean): string {
  if (isLeaning) {
    return `hsla(0, 72%, 55%, ${0.4 + intensity * 0.4})`;
  }
  if (intensity < 0.3) return `hsla(174, 72%, 50%, ${0.15 + intensity * 0.5})`;
  if (intensity < 0.5) return `hsla(160, 60%, 45%, ${0.3 + intensity * 0.5})`;
  return `hsla(174, 60%, 45%, ${0.35 + intensity * 0.4})`;
}

function getGlow(intensity: number, isLeaning: boolean): string {
  if (isLeaning) return `0 0 35px hsla(0, 72%, 55%, ${0.2 + intensity * 0.15})`;
  if (intensity < 0.3) return "0 0 15px hsla(174, 72%, 50%, 0.15)";
  return "0 0 25px hsla(174, 60%, 45%, 0.2)";
}

interface QuadrantProps {
  label: string;
  pin: string;
  value: number;
  isLeaning: boolean;
}

function Quadrant({ label, pin, value, isLeaning }: QuadrantProps) {
  const intensity = getIntensity(value);
  return (
    <motion.div
      className="relative flex flex-col items-center justify-center rounded-2xl border border-glass-border transition-all duration-500 w-full h-full"
      style={{
        backgroundColor: getColor(intensity, isLeaning),
        boxShadow: getGlow(intensity, isLeaning),
      }}
      animate={{ scale: [1, 1 + intensity * 0.015, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      <span className="text-[10px] font-medium tracking-wider uppercase text-foreground/40">{pin}</span>
      <span className="text-xs font-medium tracking-wider uppercase text-foreground/70">{label}</span>
      <span className="text-base font-mono font-semibold text-foreground">{value.toFixed(2)}V</span>
    </motion.div>
  );
}

export default function SeatVisualization({ data, analysis }: SeatVisualizationProps) {
  const d = data || { front: 0, back: 0, left: 0, right: 0, timestamp: 0 };
  const leaningSide = data ? detectLeaningSide(d) : null;

  return (
    <div className="glass p-6 glow-primary">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Seat Pressure Map</h3>
      <div className="w-full max-w-[300px] mx-auto">
        <div className="relative rounded-3xl border-2 border-glass-border/50 bg-secondary/10 p-3">
          <div className="grid grid-rows-3 gap-2" style={{ gridTemplateRows: "1fr 1fr 1fr" }}>
            <div className="flex justify-center">
              <div className="w-[55%] h-[72px]">
                <Quadrant label="Front" pin="A3" value={d.front} isLeaning={leaningSide === "front"} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="w-[38%] h-[72px]">
                <Quadrant label="Left" pin="A0" value={d.left} isLeaning={leaningSide === "left"} />
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border border-primary/30 bg-primary/5 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
                </div>
              </div>
              <div className="w-[38%] h-[72px]">
                <Quadrant label="Right" pin="A2" value={d.right} isLeaning={leaningSide === "right"} />
              </div>
            </div>
            <div className="flex justify-center">
              <div className="w-[55%] h-[72px]">
                <Quadrant label="Back" pin="A1" value={d.back} isLeaning={leaningSide === "back"} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
