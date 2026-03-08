import { motion } from "framer-motion";
import { PressureData } from "@/lib/posture";

interface SeatVisualizationProps {
  data: PressureData | null;
}

function getIntensity(value: number): number {
  return Math.min(1, Math.max(0, value / 2.0));
}

function getColor(intensity: number): string {
  if (intensity < 0.3) return `hsla(174, 72%, 50%, ${0.15 + intensity * 0.5})`;
  if (intensity < 0.6) return `hsla(160, 60%, 45%, ${0.3 + intensity * 0.5})`;
  if (intensity < 0.8) return `hsla(38, 92%, 55%, ${0.4 + intensity * 0.4})`;
  return `hsla(0, 72%, 55%, ${0.5 + intensity * 0.3})`;
}

function getGlow(intensity: number): string {
  if (intensity < 0.3) return "0 0 20px hsla(174, 72%, 50%, 0.2)";
  if (intensity < 0.6) return "0 0 30px hsla(160, 60%, 45%, 0.3)";
  if (intensity < 0.8) return "0 0 35px hsla(38, 92%, 55%, 0.3)";
  return "0 0 40px hsla(0, 72%, 55%, 0.35)";
}

interface QuadrantProps {
  label: string;
  value: number;
  className?: string;
  style?: React.CSSProperties;
}

function Quadrant({ label, value, className, style }: QuadrantProps) {
  const intensity = getIntensity(value);
  return (
    <motion.div
      className={`relative flex flex-col items-center justify-center rounded-2xl border border-glass-border transition-all duration-500 ${className}`}
      style={{
        backgroundColor: getColor(intensity),
        boxShadow: getGlow(intensity),
        ...style,
      }}
      animate={{ scale: [1, 1 + intensity * 0.02, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      <span className="text-xs font-medium tracking-wider uppercase text-foreground/60">{label}</span>
      <span className="text-lg font-mono font-semibold text-foreground">{value.toFixed(2)}V</span>
    </motion.div>
  );
}

export default function SeatVisualization({ data }: SeatVisualizationProps) {
  const d = data || { front: 0, back: 0, left: 0, right: 0, timestamp: 0 };

  return (
    <div className="glass p-6 glow-primary">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Seat Pressure Map</h3>
      <div className="relative w-full max-w-[280px] mx-auto aspect-square">
        {/* Seat outline */}
        <div className="absolute inset-2 rounded-3xl border-2 border-glass-border/50 bg-secondary/20" />

        {/* Front (top) */}
        <Quadrant
          label="Front"
          value={d.front}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[45%] h-[30%]"
        />

        {/* Back (bottom) */}
        <Quadrant
          label="Back"
          value={d.back}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[45%] h-[30%]"
        />

        {/* Left */}
        <Quadrant
          label="Left"
          value={d.left}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[30%] h-[45%]"
        />

        {/* Right */}
        <Quadrant
          label="Right"
          value={d.right}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-[30%] h-[45%]"
        />

        {/* Center indicator */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border border-primary/30 bg-primary/5 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
          </div>
        </div>
      </div>
    </div>
  );
}
