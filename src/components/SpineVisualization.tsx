import { motion } from "framer-motion";
import { PostureAnalysis } from "@/lib/posture";
import { useMemo } from "react";

interface SpineVisualizationProps {
  analysis: PostureAnalysis | null;
}

interface Vertebra {
  id: string;
  label: string;
  region: "cervical" | "thoracic" | "lumbar" | "sacral";
  y: number;
  frontWidth: number;  // coronal width
  sideDepth: number;   // sagittal depth
  bodyHeight: number;
}

const VERTEBRAE: Vertebra[] = [
  { id: "c1", label: "C1", region: "cervical", y: 22, frontWidth: 16, sideDepth: 12, bodyHeight: 7 },
  { id: "c2", label: "C2", region: "cervical", y: 38, frontWidth: 17, sideDepth: 13, bodyHeight: 7 },
  { id: "c4", label: "C4", region: "cervical", y: 54, frontWidth: 18, sideDepth: 14, bodyHeight: 8 },
  { id: "c6", label: "C6", region: "cervical", y: 70, frontWidth: 20, sideDepth: 15, bodyHeight: 8 },
  { id: "c7", label: "C7", region: "cervical", y: 86, frontWidth: 22, sideDepth: 16, bodyHeight: 9 },
  { id: "t1", label: "T1", region: "thoracic", y: 104, frontWidth: 24, sideDepth: 18, bodyHeight: 9 },
  { id: "t3", label: "T3", region: "thoracic", y: 124, frontWidth: 26, sideDepth: 20, bodyHeight: 10 },
  { id: "t5", label: "T5", region: "thoracic", y: 146, frontWidth: 27, sideDepth: 22, bodyHeight: 10 },
  { id: "t7", label: "T7", region: "thoracic", y: 168, frontWidth: 28, sideDepth: 23, bodyHeight: 10 },
  { id: "t9", label: "T9", region: "thoracic", y: 190, frontWidth: 28, sideDepth: 23, bodyHeight: 10 },
  { id: "t11", label: "T11", region: "thoracic", y: 212, frontWidth: 28, sideDepth: 22, bodyHeight: 10 },
  { id: "t12", label: "T12", region: "thoracic", y: 232, frontWidth: 30, sideDepth: 24, bodyHeight: 11 },
  { id: "l1", label: "L1", region: "lumbar", y: 254, frontWidth: 32, sideDepth: 26, bodyHeight: 12 },
  { id: "l2", label: "L2", region: "lumbar", y: 276, frontWidth: 34, sideDepth: 28, bodyHeight: 12 },
  { id: "l3", label: "L3", region: "lumbar", y: 298, frontWidth: 36, sideDepth: 30, bodyHeight: 13 },
  { id: "l4", label: "L4", region: "lumbar", y: 322, frontWidth: 37, sideDepth: 30, bodyHeight: 13 },
  { id: "l5", label: "L5", region: "lumbar", y: 346, frontWidth: 38, sideDepth: 30, bodyHeight: 14 },
  { id: "s1", label: "S1", region: "sacral", y: 372, frontWidth: 40, sideDepth: 28, bodyHeight: 12 },
  { id: "s2", label: "S2", region: "sacral", y: 392, frontWidth: 36, sideDepth: 24, bodyHeight: 10 },
  { id: "s3", label: "S3", region: "sacral", y: 408, frontWidth: 30, sideDepth: 20, bodyHeight: 8 },
];

function computeSpineState(analysis: PostureAnalysis | null) {
  const frontOffsets: number[] = [];
  const sideOffsets: number[] = [];
  const stressLevels: number[] = [];

  const status = analysis?.status ?? "balanced";
  const fbImbalance = analysis?.fbImbalance ?? 0;
  const lrImbalance = analysis?.lrImbalance ?? 0;
  const score = analysis?.score ?? 100;

  const lrSign = status === "leaning-left" ? -1 : status === "leaning-right" ? 1 : 0;
  const fbSign = status === "leaning-forward" || status === "slouch-risk" ? 1 : status === "leaning-backward" ? -1 : 0;

  VERTEBRAE.forEach((_, i) => {
    const t = i / (VERTEBRAE.length - 1);

    // --- FRONT VIEW (coronal plane) ---
    // Lateral scoliosis-like curve when leaning left/right
    const lateralCurve = Math.sin(t * Math.PI) * lrImbalance * 22 * lrSign;
    frontOffsets.push(lateralCurve);

    // --- SIDE VIEW (sagittal plane) ---
    // Natural S-curve: cervical lordosis, thoracic kyphosis, lumbar lordosis
    let naturalCurve = 0;
    if (t < 0.25) {
      // Cervical lordosis (curves forward/anterior)
      naturalCurve = Math.sin(t / 0.25 * Math.PI) * 6;
    } else if (t < 0.55) {
      // Thoracic kyphosis (curves backward/posterior)
      const tNorm = (t - 0.25) / 0.3;
      naturalCurve = -Math.sin(tNorm * Math.PI) * 10;
    } else if (t < 0.85) {
      // Lumbar lordosis (curves forward/anterior)
      const tNorm = (t - 0.55) / 0.3;
      naturalCurve = Math.sin(tNorm * Math.PI) * 8;
    }

    // Posture deviation
    let postureShift = 0;
    if (fbSign > 0) {
      // Forward lean: head drops forward, thoracic kyphosis increases, lumbar flattens
      const headDrop = t < 0.3 ? Math.sin((0.3 - t) / 0.3 * Math.PI * 0.5) * fbImbalance * 20 : 0;
      const thoracicIncrease = t >= 0.2 && t <= 0.55 ? -Math.sin(((t - 0.2) / 0.35) * Math.PI) * fbImbalance * 12 : 0;
      const lumbarFlatten = t >= 0.55 && t <= 0.85 ? -Math.sin(((t - 0.55) / 0.3) * Math.PI) * fbImbalance * 6 : 0;
      postureShift = headDrop + thoracicIncrease + lumbarFlatten;
    } else if (fbSign < 0) {
      // Backward lean: thoracic extension, lumbar lordosis increases
      const thoracicExtend = t >= 0.2 && t <= 0.55 ? Math.sin(((t - 0.2) / 0.35) * Math.PI) * fbImbalance * 10 : 0;
      const lumbarIncrease = t >= 0.55 && t <= 0.85 ? Math.sin(((t - 0.55) / 0.3) * Math.PI) * fbImbalance * 8 : 0;
      postureShift = thoracicExtend + lumbarIncrease;
    }

    sideOffsets.push(naturalCurve + postureShift);

    // --- STRESS LEVELS (0-1) ---
    let stress = 0;
    if (status === "leaning-forward" || status === "slouch-risk") {
      if (t >= 0.6 && t <= 0.9) stress = Math.sin(((t - 0.6) / 0.3) * Math.PI) * Math.min(1, fbImbalance * 2.5);
      if (t < 0.2) stress = Math.max(stress, (0.2 - t) / 0.2 * Math.min(1, fbImbalance * 2));
    } else if (status === "leaning-backward") {
      if (t >= 0.25 && t <= 0.55) stress = Math.sin(((t - 0.25) / 0.3) * Math.PI) * Math.min(1, fbImbalance * 2);
    } else if (status === "leaning-left" || status === "leaning-right") {
      if (t >= 0.3 && t <= 0.7) stress = Math.sin(((t - 0.3) / 0.4) * Math.PI) * Math.min(1, lrImbalance * 2);
    }
    stressLevels.push(stress);
  });

  return { frontOffsets, sideOffsets, stressLevels };
}

function vertebraColor(stress: number, score: number): string {
  if (stress > 0.6) return `hsla(0, 72%, ${45 + stress * 15}%, ${0.7 + stress * 0.25})`;
  if (stress > 0.3) return `hsla(30, 85%, ${50 + stress * 10}%, ${0.6 + stress * 0.2})`;
  if (stress > 0.05) return `hsla(174, 60%, 50%, ${0.4 + stress * 0.3})`;
  return "hsla(200, 30%, 65%, 0.45)";
}

function discGradientColor(stress: number): [string, string] {
  if (stress > 0.5) return ["hsla(0, 60%, 40%, 0.5)", "hsla(0, 60%, 30%, 0.2)"];
  if (stress > 0.2) return ["hsla(38, 70%, 45%, 0.4)", "hsla(38, 70%, 35%, 0.15)"];
  return ["hsla(200, 40%, 55%, 0.2)", "hsla(200, 40%, 45%, 0.08)"];
}

// SVG definitions for realistic gradients
function SvgDefs({ stressLevels, score }: { stressLevels: number[]; score: number }) {
  return (
    <defs>
      {/* Bone texture gradient */}
      <linearGradient id="boneGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="hsla(40, 20%, 85%, 0.9)" />
        <stop offset="40%" stopColor="hsla(35, 15%, 75%, 0.8)" />
        <stop offset="100%" stopColor="hsla(30, 12%, 60%, 0.7)" />
      </linearGradient>
      <linearGradient id="boneHighlight" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="hsla(0, 0%, 100%, 0.15)" />
        <stop offset="50%" stopColor="hsla(0, 0%, 100%, 0.05)" />
        <stop offset="100%" stopColor="hsla(0, 0%, 0%, 0.1)" />
      </linearGradient>
      {/* Disc gradients */}
      {VERTEBRAE.map((_, i) => {
        const [c1, c2] = discGradientColor(stressLevels[i] ?? 0);
        return (
          <radialGradient key={`disc-${i}`} id={`discGrad${i}`}>
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </radialGradient>
        );
      })}
      {/* Glow filter */}
      <filter id="stressGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="shadow" />
        <feOffset dx="1" dy="1" />
        <feComposite in2="SourceGraphic" operator="over" />
      </filter>
    </defs>
  );
}

interface SpineViewProps {
  centerX: number;
  offsets: number[];
  stressLevels: number[];
  score: number;
  viewLabel: string;
  useSideDepth?: boolean;
}

function SpineView({ centerX, offsets, stressLevels, score, viewLabel, useSideDepth }: SpineViewProps) {
  return (
    <g>
      {/* View label */}
      <text x={centerX} y={12} textAnchor="middle" fill="hsla(215, 15%, 55%, 0.6)" fontSize="9" fontWeight="600" letterSpacing="2">
        {viewLabel}
      </text>

      {/* Spinal canal / cord */}
      <motion.path
        d={VERTEBRAE.map((v, i) => `${i === 0 ? "M" : "L"} ${centerX + offsets[i]},${v.y}`).join(" ")}
        fill="none"
        stroke="hsla(200, 40%, 60%, 0.12)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{
          d: VERTEBRAE.map((v, i) => `${i === 0 ? "M" : "L"} ${centerX + offsets[i]},${v.y}`).join(" "),
        }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
      <motion.path
        d={VERTEBRAE.map((v, i) => `${i === 0 ? "M" : "L"} ${centerX + offsets[i]},${v.y}`).join(" ")}
        fill="none"
        stroke="hsla(174, 50%, 55%, 0.18)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{
          d: VERTEBRAE.map((v, i) => `${i === 0 ? "M" : "L"} ${centerX + offsets[i]},${v.y}`).join(" "),
        }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />

      {/* Vertebrae */}
      {VERTEBRAE.map((v, i) => {
        const x = centerX + offsets[i];
        const w = useSideDepth ? v.sideDepth : v.frontWidth;
        const h = v.bodyHeight;
        const stress = stressLevels[i];
        const color = vertebraColor(stress, score);
        const isStressed = stress > 0.2;

        return (
          <g key={v.id}>
            {/* Disc below (between this and next vertebra) */}
            {i < VERTEBRAE.length - 1 && (
              <motion.ellipse
                rx={w * 0.4}
                ry={2.5}
                fill={`url(#discGrad${i})`}
                animate={{
                  cx: x,
                  cy: v.y + h / 2 + 3,
                  rx: isStressed ? w * 0.3 : w * 0.4,
                }}
                transition={{ duration: 0.7 }}
              />
            )}

            {/* Vertebra body — rounded rect with 3D shading */}
            <motion.rect
              width={w}
              height={h}
              rx={2.5}
              ry={2}
              fill={color}
              filter={isStressed ? "url(#stressGlow)" : undefined}
              animate={{
                x: x - w / 2,
                y: v.y - h / 2,
              }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
            {/* Top highlight for 3D effect */}
            <motion.rect
              width={w - 2}
              height={h * 0.4}
              rx={2}
              fill="url(#boneHighlight)"
              animate={{
                x: x - w / 2 + 1,
                y: v.y - h / 2,
              }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />

            {/* Spinous process (back spike) — only on front view */}
            {!useSideDepth && v.region !== "sacral" && (
              <motion.line
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                animate={{
                  x1: x,
                  y1: v.y,
                  x2: x,
                  y2: v.y - h * 0.8 - 4,
                }}
                transition={{ duration: 0.7 }}
              />
            )}

            {/* Transverse processes — only on front view */}
            {!useSideDepth && v.region !== "sacral" && (
              <>
                <motion.line
                  stroke={color}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  animate={{
                    x1: x - w / 2,
                    y1: v.y,
                    x2: x - w / 2 - (v.region === "lumbar" ? 6 : 4),
                    y2: v.y - 2,
                  }}
                  transition={{ duration: 0.7 }}
                />
                <motion.line
                  stroke={color}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  animate={{
                    x1: x + w / 2,
                    y1: v.y,
                    x2: x + w / 2 + (v.region === "lumbar" ? 6 : 4),
                    y2: v.y - 2,
                  }}
                  transition={{ duration: 0.7 }}
                />
              </>
            )}

            {/* Spinous process — side view */}
            {useSideDepth && v.region !== "sacral" && (
              <motion.line
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                animate={{
                  x1: x - w / 2,
                  y1: v.y,
                  x2: x - w / 2 - (v.region === "thoracic" ? 10 : 6),
                  y2: v.y + (v.region === "thoracic" ? 3 : 1),
                }}
                transition={{ duration: 0.7 }}
              />
            )}

            {/* Stress pulse ring */}
            {isStressed && (
              <motion.ellipse
                rx={w / 2 + 4}
                ry={h / 2 + 3}
                fill="none"
                stroke={stress > 0.5 ? "hsla(0, 70%, 55%, 0.35)" : "hsla(38, 80%, 55%, 0.25)"}
                strokeWidth="1"
                animate={{
                  cx: x,
                  cy: v.y,
                  opacity: [0.2, 0.6, 0.2],
                  rx: [w / 2 + 3, w / 2 + 6, w / 2 + 3],
                  ry: [h / 2 + 2, h / 2 + 5, h / 2 + 2],
                }}
                transition={{
                  cx: { duration: 0.7 },
                  cy: { duration: 0.7 },
                  opacity: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
                  rx: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
                  ry: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
                }}
              />
            )}
          </g>
        );
      })}

      {/* Region labels */}
      {[
        { label: "Cervical", y: 55 },
        { label: "Thoracic", y: 170 },
        { label: "Lumbar", y: 300 },
        { label: "Sacral", y: 392 },
      ].map((r) => (
        <text key={r.label} x={centerX + 50} y={r.y} fill="hsla(215, 15%, 55%, 0.25)" fontSize="7" fontFamily="monospace">
          {r.label}
        </text>
      ))}
    </g>
  );
}

export default function SpineVisualization({ analysis }: SpineVisualizationProps) {
  const score = analysis?.score ?? 100;
  const { frontOffsets, sideOffsets, stressLevels } = useMemo(() => computeSpineState(analysis), [analysis]);

  const statusLabel = analysis?.label ?? "Waiting...";
  const statusColor = score >= 80 ? "text-glow-good" : score >= 50 ? "text-glow-warning" : "text-glow-danger";

  return (
    <div className="glass p-6 glow-primary h-full flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Spinal Impact Analysis
        </h3>
        <span className={`text-xs font-semibold ${statusColor}`}>{statusLabel}</span>
      </div>
      <p className="text-[10px] text-muted-foreground/60 mb-3">
        Real-time vertebral stress visualization • Cervical through Sacral
      </p>

      <div className="flex-1 flex items-center justify-center gap-2">
        {/* Front view */}
        <svg viewBox="0 0 160 430" className="w-full max-w-[160px] h-auto flex-shrink-0">
          <SvgDefs stressLevels={stressLevels} score={score} />
          <SpineView
            centerX={75}
            offsets={frontOffsets}
            stressLevels={stressLevels}
            score={score}
            viewLabel="FRONT"
          />
        </svg>

        {/* Divider */}
        <div className="w-px h-[80%] bg-glass-border/30 flex-shrink-0" />

        {/* Side view */}
        <svg viewBox="0 0 160 430" className="w-full max-w-[160px] h-auto flex-shrink-0">
          <SvgDefs stressLevels={stressLevels} score={score} />
          <SpineView
            centerX={80}
            offsets={sideOffsets}
            stressLevels={stressLevels}
            score={score}
            viewLabel="SIDE"
            useSideDepth
          />
        </svg>
      </div>
    </div>
  );
}
