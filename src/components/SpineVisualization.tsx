import { motion } from "framer-motion";
import { PostureAnalysis } from "@/lib/posture";

interface SpineVisualizationProps {
  analysis: PostureAnalysis | null;
}

interface Vertebra {
  id: string;
  label: string;
  y: number;
  size: number;
}

const VERTEBRAE: Vertebra[] = [
  { id: "c1", label: "C1", y: 30, size: 18 },
  { id: "c3", label: "C3", y: 52, size: 20 },
  { id: "c5", label: "C5", y: 74, size: 22 },
  { id: "c7", label: "C7", y: 96, size: 24 },
  { id: "t1", label: "T1", y: 120, size: 26 },
  { id: "t3", label: "T3", y: 146, size: 28 },
  { id: "t5", label: "T5", y: 172, size: 30 },
  { id: "t7", label: "T7", y: 198, size: 30 },
  { id: "t9", label: "T9", y: 224, size: 30 },
  { id: "t11", label: "T11", y: 250, size: 28 },
  { id: "l1", label: "L1", y: 278, size: 32 },
  { id: "l3", label: "L3", y: 308, size: 34 },
  { id: "l5", label: "L5", y: 338, size: 36 },
  { id: "s1", label: "S1", y: 370, size: 38 },
  { id: "s3", label: "S3", y: 398, size: 34 },
];

function getSpineOffsets(analysis: PostureAnalysis | null) {
  if (!analysis) return { offsets: VERTEBRAE.map(() => 0), stressZones: [] as number[] };

  const { fbImbalance, lrImbalance, status } = analysis;
  const offsets: number[] = [];
  const stressZones: number[] = [];

  // Lateral offset based on left-right imbalance
  const lrSign = status === "leaning-left" ? -1 : status === "leaning-right" ? 1 : 0;
  const lrMag = lrImbalance * 18;

  // Forward/back curvature
  const fbSign = status === "leaning-forward" || status === "slouch-risk" ? 1 : status === "leaning-backward" ? -1 : 0;
  const fbMag = fbImbalance * 14;

  VERTEBRAE.forEach((v, i) => {
    const t = i / (VERTEBRAE.length - 1); // 0 = top (cervical), 1 = bottom (sacral)

    // Natural S-curve offset
    let offset = 0;

    // Lateral lean: peaks in mid-spine
    const lateralCurve = Math.sin(t * Math.PI) * lrMag * lrSign;
    offset += lateralCurve;

    // Forward lean creates increased curvature in lumbar (t=0.7-0.9)
    if (fbSign !== 0) {
      const lumbarStress = Math.exp(-((t - 0.8) ** 2) / 0.05) * fbMag * fbSign;
      offset += lumbarStress * 0.5; // subtle lateral component
    }

    offsets.push(offset);

    // Mark stress zones
    if (status === "leaning-forward" || status === "slouch-risk") {
      // Lumbar stress (L1-L5)
      if (t >= 0.65 && t <= 0.9) stressZones.push(i);
    } else if (status === "leaning-backward") {
      // Thoracic stress
      if (t >= 0.3 && t <= 0.6) stressZones.push(i);
    } else if (status === "leaning-left" || status === "leaning-right") {
      // Mid-spine stress
      if (t >= 0.35 && t <= 0.7) stressZones.push(i);
    }
  });

  return { offsets, stressZones };
}

function getVertebraColor(index: number, stressZones: number[], score: number): string {
  if (stressZones.includes(index)) {
    if (score < 50) return "hsla(0, 72%, 55%, 0.9)";
    if (score < 70) return "hsla(38, 92%, 55%, 0.85)";
    return "hsla(38, 92%, 55%, 0.6)";
  }
  return "hsla(174, 72%, 50%, 0.5)";
}

function getDiscColor(index: number, stressZones: number[]): string {
  if (stressZones.includes(index)) return "hsla(38, 92%, 55%, 0.3)";
  return "hsla(174, 72%, 50%, 0.15)";
}

export default function SpineVisualization({ analysis }: SpineVisualizationProps) {
  const score = analysis?.score ?? 100;
  const { offsets, stressZones } = getSpineOffsets(analysis);
  const centerX = 120;

  const statusLabel = analysis?.label ?? "Waiting...";
  const statusColor = score >= 80
    ? "text-glow-good"
    : score >= 50
      ? "text-glow-warning"
      : "text-glow-danger";

  return (
    <div className="glass p-6 glow-primary h-full flex flex-col">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        Spinal Impact
      </h3>
      <p className={`text-xs font-medium mb-4 ${statusColor}`}>{statusLabel}</p>

      <div className="flex-1 flex items-center justify-center">
        <svg viewBox="0 0 240 430" className="w-full max-w-[200px] h-auto">
          {/* Spinal cord line */}
          <motion.path
            d={`M ${VERTEBRAE.map((v, i) => `${centerX + offsets[i]},${v.y}`).join(" L ")}`}
            fill="none"
            stroke="hsla(174, 72%, 50%, 0.2)"
            strokeWidth="3"
            strokeLinecap="round"
            animate={{
              d: `M ${VERTEBRAE.map((v, i) => `${centerX + offsets[i]},${v.y}`).join(" L ")}`,
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />

          {/* Vertebrae */}
          {VERTEBRAE.map((v, i) => {
            const x = centerX + offsets[i];
            const color = getVertebraColor(i, stressZones, score);
            const discColor = getDiscColor(i, stressZones);
            const isStressed = stressZones.includes(i);

            return (
              <g key={v.id}>
                {/* Disc between vertebrae */}
                {i < VERTEBRAE.length - 1 && (
                  <motion.ellipse
                    cx={x}
                    cy={v.y + (VERTEBRAE[i + 1].y - v.y) / 2}
                    rx={v.size * 0.35}
                    ry={3}
                    fill={discColor}
                    animate={{
                      cx: x,
                      rx: isStressed ? v.size * 0.25 : v.size * 0.35,
                    }}
                    transition={{ duration: 0.6 }}
                  />
                )}

                {/* Vertebra body */}
                <motion.rect
                  x={x - v.size / 2}
                  y={v.y - 5}
                  width={v.size}
                  height={10}
                  rx={3}
                  fill={color}
                  animate={{
                    x: x - v.size / 2,
                    fill: color,
                  }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />

                {/* Stress glow */}
                {isStressed && (
                  <motion.rect
                    x={x - v.size / 2 - 3}
                    y={v.y - 8}
                    width={v.size + 6}
                    height={16}
                    rx={5}
                    fill="none"
                    stroke={score < 50 ? "hsla(0, 72%, 55%, 0.4)" : "hsla(38, 92%, 55%, 0.3)"}
                    strokeWidth="1"
                    animate={{
                      x: x - v.size / 2 - 3,
                      opacity: [0.3, 0.7, 0.3],
                    }}
                    transition={{
                      x: { duration: 0.6 },
                      opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                    }}
                  />
                )}

                {/* Label */}
                <motion.text
                  x={x + v.size / 2 + 8}
                  y={v.y + 4}
                  fill="hsla(215, 15%, 55%, 0.5)"
                  fontSize="8"
                  fontFamily="monospace"
                  animate={{ x: x + v.size / 2 + 8 }}
                  transition={{ duration: 0.6 }}
                >
                  {v.label}
                </motion.text>
              </g>
            );
          })}

          {/* Stress zone labels */}
          {stressZones.length > 0 && (
            <motion.text
              x={20}
              y={VERTEBRAE[stressZones[Math.floor(stressZones.length / 2)]].y}
              fill={score < 50 ? "hsla(0, 72%, 55%, 0.7)" : "hsla(38, 92%, 55%, 0.6)"}
              fontSize="9"
              fontWeight="600"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              STRESS
            </motion.text>
          )}
        </svg>
      </div>
    </div>
  );
}
