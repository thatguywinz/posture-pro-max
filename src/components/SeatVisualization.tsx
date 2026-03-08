import { motion } from "framer-motion";
import { PressureData } from "@/lib/posture";

interface SeatVisualizationProps {
  data: PressureData | null;
}

function getIntensity(value: number): number {
  return Math.min(1, Math.max(0, value / 3.0));
}

function getColor(intensity: number): string {
  if (intensity < 0.3) return `hsla(174, 72%, 50%, ${0.15 + intensity * 0.5})`;
  if (intensity < 0.5) return `hsla(160, 60%, 45%, ${0.3 + intensity * 0.5})`;
  if (intensity < 0.7) return `hsla(38, 92%, 55%, ${0.4 + intensity * 0.4})`;
  return `hsla(0, 72%, 55%, ${0.5 + intensity * 0.3})`;
}

function getGlow(intensity: number): string {
  if (intensity < 0.3) return "0 0 15px hsla(174, 72%, 50%, 0.15)";
  if (intensity < 0.5) return "0 0 25px hsla(160, 60%, 45%, 0.25)";
  if (intensity < 0.7) return "0 0 30px hsla(38, 92%, 55%, 0.25)";
  return "0 0 35px hsla(0, 72%, 55%, 0.3)";
}

interface QuadrantProps {
  label: string;
  pin: string;
  value: number;
}

function Quadrant({ label, pin, value }: QuadrantProps) {
  const intensity = getIntensity(value);
  return (
    <motion.div
      className="relative flex flex-col items-center justify-center rounded-2xl border border-glass-border transition-all duration-500 w-full h-full"
      style={{
        backgroundColor: getColor(intensity),
        boxShadow: getGlow(intensity),
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

export default function SeatVisualization({ data }: SeatVisualizationProps) {
  const d = data || { front: 0, back: 0, left: 0, right: 0, timestamp: 0 };

  return (
    <div className="glass p-6 glow-primary">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Seat Pressure Map</h3>
      <div className="w-full max-w-[300px] mx-auto">
        {/* Seat shape container */}
        <div className="relative rounded-3xl border-2 border-glass-border/50 bg-secondary/10 p-3">
          {/* 3-row grid: top=Front, middle=Left+dot+Right, bottom=Back */}
          <div className="grid grid-rows-3 gap-2" style={{ gridTemplateRows: "1fr 1fr 1fr" }}>
            {/* Row 1: Front (top center) */}
            <div className="flex justify-center">
              <div className="w-[55%] h-[72px]">
                <Quadrant label="Front" pin="A3" value={d.front} />
              </div>
            </div>

            {/* Row 2: Left + center dot + Right */}
            <div className="flex items-center justify-between gap-2">
              <div className="w-[38%] h-[72px]">
                <Quadrant label="Left" pin="A0" value={d.left} />
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border border-primary/30 bg-primary/5 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
                </div>
              </div>
              <div className="w-[38%] h-[72px]">
                <Quadrant label="Right" pin="A2" value={d.right} />
              </div>
            </div>

            {/* Row 3: Back (bottom center) */}
            <div className="flex justify-center">
              <div className="w-[55%] h-[72px]">
                <Quadrant label="Back" pin="A1" value={d.back} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
