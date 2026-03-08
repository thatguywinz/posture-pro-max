// ============================================================
// Posture Pro — Scoring Engine
// 
// Design goals:
// - Smooth, stable scores that don't flicker
// - Threshold-based penalties (not raw voltage diffs)
// - Hysteresis to avoid state oscillation
// - Calm, realistic language throughout
// ============================================================

export interface PressureData {
  front: number;
  back: number;
  left: number;
  right: number;
  timestamp: number;
}

/** Smoothed pressure values + derived metrics */
export interface SmoothedData {
  smoothedFront: number;
  smoothedBack: number;
  smoothedLeft: number;
  smoothedRight: number;
  totalPressure: number;
  frontBackImbalance: number;
  leftRightImbalance: number;
  normalizedFrontBackImbalance: number;
  normalizedLeftRightImbalance: number;
}

export type PostureStatus =
  | "balanced"
  | "leaning-forward"
  | "leaning-backward"
  | "leaning-left"
  | "leaning-right"
  | "uneven"
  | "slouch-risk"
  | "unstable";

export interface PostureAnalysis {
  status: PostureStatus;
  label: string;
  score: number;              // Posture score 0-100
  balanceScore: number;       // Left-Right Balance 0-100
  fbBalanceScore: number;     // Front-Back Stability 0-100
  explanation: string;
  recommendations: string[];
  fbImbalance: number;        // normalized front-back imbalance (0-1+)
  lrImbalance: number;        // normalized left-right imbalance (0-1+)
}

export interface SessionStats {
  startTime: number;
  balancedTime: number;
  totalTime: number;
  warningCount: number;
  longestBalancedStreak: number;
  currentBalancedStreak: number;
}

// ============================================================
// Tunable constants — easy to adjust later
// ============================================================

/** Exponential smoothing factor (0-1). Lower = more smoothing. */
export const SMOOTHING_ALPHA = 0.15;

/** Score recovery smoothing — how fast score climbs back (0-1). */
export const SCORE_RECOVERY_ALPHA = 0.08;

/** Score drop smoothing — how fast score falls (0-1). */
export const SCORE_DROP_ALPHA = 0.12;

/** Voltage difference below which we apply no penalty at all. */
const DEAD_ZONE = 0.15;

/** Voltage difference where mild penalty begins. */
const MILD_THRESHOLD = 0.5;

/** Voltage difference where strong penalty begins. */
const STRONG_THRESHOLD = 4.0;

/** Maximum penalty per axis at extreme imbalance. */
const MAX_AXIS_PENALTY = 45;

/** How long (in seconds) imbalance must persist before triggering a warning. */
export const SUSTAINED_WARNING_DURATION = 4.0;

/** Hysteresis margin for status transitions (normalized imbalance). */
const HYSTERESIS_MARGIN = 0.03;

/** Minimum total pressure to be considered "seated". */
const SEATED_THRESHOLD = 0.3;

/** Normalized imbalance threshold for status detection. */
const STATUS_THRESHOLD = 0.18;

/** Normalized imbalance threshold for slouch detection. */
const SLOUCH_THRESHOLD = 0.28;

/** Duration (seconds) of consistent decline before treating it as charge drift. */
const DRIFT_DETECTION_WINDOW = 3.0;

/** Max voltage drop per second to qualify as gradual drift (not a real shift). */
const DRIFT_RATE_THRESHOLD = 0.15;

// ============================================================
// Smoothing state — maintained across calls
// ============================================================

export interface SmoothingState {
  smoothedFront: number;
  smoothedBack: number;
  smoothedLeft: number;
  smoothedRight: number;
  smoothedScore: number;
  smoothedLRBalance: number;
  smoothedFBBalance: number;
  previousStatus: PostureStatus;
  sustainedImbalanceDuration: number;
  initialized: boolean;
  // Drift detection: track recent per-sensor values to detect consistent decline
  recentFront: number[];
  recentBack: number[];
  recentLeft: number[];
  recentRight: number[];
  // Accumulated drift compensation per sensor
  driftCompFront: number;
  driftCompBack: number;
  driftCompLeft: number;
  driftCompRight: number;
}

export function createSmoothingState(): SmoothingState {
  return {
    smoothedFront: 0,
    smoothedBack: 0,
    smoothedLeft: 0,
    smoothedRight: 0,
    smoothedScore: 85,
    smoothedLRBalance: 90,
    smoothedFBBalance: 90,
    previousStatus: "balanced",
    sustainedImbalanceDuration: 0,
    initialized: false,
    recentFront: [],
    recentBack: [],
    recentLeft: [],
    recentRight: [],
    driftCompFront: 0,
    driftCompBack: 0,
    driftCompLeft: 0,
    driftCompRight: 0,
  };
}

/** Exponential moving average step */
function ema(prev: number, next: number, alpha: number): number {
  return prev + alpha * (next - prev);
}

/**
 * Compute a soft penalty that ramps gradually.
 * - Below deadZone: 0 penalty
 * - Between deadZone and mildThreshold: very gentle ramp
 * - Between mildThreshold and strongThreshold: moderate ramp
 * - Above strongThreshold: approaches maxPenalty
 */
function computePenalty(
  diff: number,
  deadZone: number,
  mildThreshold: number,
  strongThreshold: number,
  maxPenalty: number
): number {
  const abs = Math.abs(diff);
  if (abs <= deadZone) return 0;

  if (abs <= mildThreshold) {
    // Gentle ramp: 0 to ~15% of max
    const t = (abs - deadZone) / (mildThreshold - deadZone);
    return t * t * maxPenalty * 0.15;
  }

  if (abs <= strongThreshold) {
    // Moderate ramp: 15% to ~60% of max
    const t = (abs - mildThreshold) / (strongThreshold - mildThreshold);
    return maxPenalty * (0.15 + t * 0.45);
  }

  // Above strong threshold: 60% to 100%, tapering off
  const excess = abs - strongThreshold;
  const remaining = maxPenalty * 0.4;
  const t = 1 - Math.exp(-excess * 0.5);
  return maxPenalty * 0.6 + t * remaining;
}

// ============================================================
// Serial data parser
// ============================================================

export function parseSerialData(line: string): PressureData | null {
  const regex = /A0:\s*([\d.]+)\s*V\s*\|\s*A1:\s*([\d.]+)\s*V\s*\|\s*A2:\s*([\d.]+)\s*V\s*\|\s*A3:\s*([\d.]+)\s*V/;
  const match = line.match(regex);
  if (!match) return null;
  return {
    left: parseFloat(match[1]),    // A0 = Left
    back: parseFloat(match[2]),    // A1 = Back
    right: parseFloat(match[3]),   // A2 = Right
    front: parseFloat(match[4]),   // A3 = Front
    timestamp: Date.now(),
  };
}

// ============================================================
// Main analysis function — uses smoothing state
// ============================================================

export function analyzePosture(
  data: PressureData,
  state: SmoothingState,
  calibration?: PressureData,
  sampleIntervalSec: number = 0.5
): PostureAnalysis {
  let { front, back, left, right } = data;

  // Apply calibration offset
  if (calibration) {
    front -= calibration.front;
    back -= calibration.back;
    left -= calibration.left;
    right -= calibration.right;
  }

  // Clamp to non-negative
  front = Math.max(0, front);
  back = Math.max(0, back);
  left = Math.max(0, left);
  right = Math.max(0, right);

  // --- Step 1: Exponential smoothing ---
  if (!state.initialized) {
    state.smoothedFront = front;
    state.smoothedBack = back;
    state.smoothedLeft = left;
    state.smoothedRight = right;
    state.initialized = true;
  } else {
    state.smoothedFront = ema(state.smoothedFront, front, SMOOTHING_ALPHA);
    state.smoothedBack = ema(state.smoothedBack, back, SMOOTHING_ALPHA);
    state.smoothedLeft = ema(state.smoothedLeft, left, SMOOTHING_ALPHA);
    state.smoothedRight = ema(state.smoothedRight, right, SMOOTHING_ALPHA);
  }

  let sf = state.smoothedFront;
  let sb = state.smoothedBack;
  let sl = state.smoothedLeft;
  let sr = state.smoothedRight;

  // --- Step 1b: Drift detection ---
  // Track recent smoothed values per sensor. If a sensor has been
  // consistently declining for DRIFT_DETECTION_WINDOW seconds at a
  // gradual rate, accumulate a compensation offset so the slow
  // discharge doesn't look like a posture shift.
  const maxSamples = Math.ceil(DRIFT_DETECTION_WINDOW / sampleIntervalSec);
  state.recentFront.push(sf);
  state.recentBack.push(sb);
  state.recentLeft.push(sl);
  state.recentRight.push(sr);
  if (state.recentFront.length > maxSamples) state.recentFront.shift();
  if (state.recentBack.length > maxSamples) state.recentBack.shift();
  if (state.recentLeft.length > maxSamples) state.recentLeft.shift();
  if (state.recentRight.length > maxSamples) state.recentRight.shift();

  function detectDrift(history: number[]): number {
    if (history.length < maxSamples) return 0;
    // Check if every consecutive sample is <= the previous (consistent decline)
    let totalDrop = 0;
    let isConsistentDrop = true;
    for (let j = 1; j < history.length; j++) {
      const delta = history[j] - history[j - 1];
      if (delta > 0.005) { // Allow tiny noise upward
        isConsistentDrop = false;
        break;
      }
      totalDrop += Math.abs(delta);
    }
    if (!isConsistentDrop) return 0;
    const ratePerSec = totalDrop / DRIFT_DETECTION_WINDOW;
    // Only compensate if rate is gradual (not a real weight shift)
    return ratePerSec <= DRIFT_RATE_THRESHOLD ? totalDrop : 0;
  }

  state.driftCompFront = detectDrift(state.recentFront);
  state.driftCompBack = detectDrift(state.recentBack);
  state.driftCompLeft = detectDrift(state.recentLeft);
  state.driftCompRight = detectDrift(state.recentRight);

  // Apply drift compensation — add back the lost voltage so it
  // doesn't create artificial imbalance
  sf += state.driftCompFront;
  sb += state.driftCompBack;
  sl += state.driftCompLeft;
  sr += state.driftCompRight;

  // --- Step 2: Derived metrics ---
  const totalPressure = sf + sb + sl + sr;
  const fbDiff = sf - sb;                // positive = more front
  const lrDiff = sl - sr;                // positive = more left

  // Normalized imbalances (0-1+), safe division
  const normalizedFB = totalPressure > 0.5 ? Math.abs(fbDiff) / (totalPressure * 0.5) : 0;
  const normalizedLR = totalPressure > 0.5 ? Math.abs(lrDiff) / (totalPressure * 0.5) : 0;

  // --- Step 3: Status detection with hysteresis ---
  let status: PostureStatus = "balanced";
  let label = "Posture looks stable";
  let explanation = "Your seated pressure is well distributed. Keep it up.";
  const recommendations: string[] = [];

  const prevStatus = state.previousStatus;
  // Use a lower threshold to stay in current state (hysteresis)
  const enterThreshold = STATUS_THRESHOLD;
  const exitThreshold = STATUS_THRESHOLD - HYSTERESIS_MARGIN;

  if (totalPressure < SEATED_THRESHOLD) {
    status = "unstable";
    label = "Not seated";
    explanation = "Very low pressure detected — you may not be on the seat.";
    recommendations.push("Sit down and center your weight for accurate readings.");
  } else if (normalizedFB > SLOUCH_THRESHOLD && fbDiff > 0) {
    status = "slouch-risk";
    label = "Possible forward loading";
    explanation = "Noticeable forward weight shift detected. If sustained, this may increase lower-back loading.";
    recommendations.push("Try sitting back against the backrest.");
    recommendations.push("A brief stretch can help relieve tension.");
  } else if (normalizedFB > (prevStatus === "leaning-forward" ? exitThreshold : enterThreshold) && fbDiff > 0) {
    status = "leaning-forward";
    label = "Slight forward shift";
    explanation = "A mild forward weight shift is detected. This is normal briefly, but sustained loading may reduce comfort.";
    recommendations.push("Consider sitting slightly further back.");
  } else if (normalizedFB > (prevStatus === "leaning-backward" ? exitThreshold : enterThreshold) && fbDiff < 0) {
    status = "leaning-backward";
    label = "Slight rearward shift";
    explanation = "More pressure toward the rear of the seat. Occasional reclining is fine.";
    recommendations.push("Sit upright with feet flat for balanced support.");
  } else if (normalizedLR > (prevStatus === "leaning-left" ? exitThreshold : enterThreshold) && lrDiff > 0) {
    status = "leaning-left";
    label = "Mild left-side loading";
    explanation = "Slight asymmetry — more pressure on the left. May suggest uneven pelvic or trunk positioning.";
    recommendations.push("Try re-centering your weight across both hips.");
  } else if (normalizedLR > (prevStatus === "leaning-right" ? exitThreshold : enterThreshold) && lrDiff < 0) {
    status = "leaning-right";
    label = "Mild right-side loading";
    explanation = "Slight asymmetry — more pressure on the right. Re-centering may improve comfort.";
    recommendations.push("Try re-centering your weight across both hips.");
  } else if (normalizedFB > 0.10 || normalizedLR > 0.10) {
    // Minor asymmetry — keep balanced status but note it
    if (prevStatus !== "balanced") {
      status = prevStatus; // hysteresis: stay in previous until clearly balanced
    }
  }

  // If clearly balanced now
  if (status === "balanced") {
    recommendations.push("Pressure distribution looks good — maintain this position.");
  }

  state.previousStatus = status;

  // --- Step 4: Sustained imbalance tracking ---
  if (status !== "balanced" && status !== "unstable") {
    state.sustainedImbalanceDuration += sampleIntervalSec;
  } else {
    // Decay slowly rather than reset instantly
    state.sustainedImbalanceDuration = Math.max(0, state.sustainedImbalanceDuration - sampleIntervalSec * 2);
  }

  // --- Step 5: Posture score with soft penalties ---
  const fbPenalty = computePenalty(Math.abs(fbDiff), DEAD_ZONE, MILD_THRESHOLD, STRONG_THRESHOLD, MAX_AXIS_PENALTY);
  const lrPenalty = computePenalty(Math.abs(lrDiff), DEAD_ZONE, MILD_THRESHOLD, STRONG_THRESHOLD, MAX_AXIS_PENALTY);

  // Combined penalty, capped at 100
  const rawPenalty = Math.min(100, fbPenalty + lrPenalty);
  const targetScore = Math.max(0, Math.min(100, Math.round(100 - rawPenalty)));

  // Smooth the score — drops gradually, recovers gradually
  const scoreAlpha = targetScore < state.smoothedScore ? SCORE_DROP_ALPHA : SCORE_RECOVERY_ALPHA;
  state.smoothedScore = ema(state.smoothedScore, targetScore, scoreAlpha);
  const score = Math.max(0, Math.min(100, Math.round(state.smoothedScore)));

  // --- Step 6: Left-Right Balance Score ---
  const lrPenaltyScore = computePenalty(Math.abs(lrDiff), DEAD_ZONE, MILD_THRESHOLD, STRONG_THRESHOLD, 50);
  const targetLR = Math.max(0, Math.min(100, Math.round(100 - lrPenaltyScore * 2)));
  state.smoothedLRBalance = ema(state.smoothedLRBalance, targetLR, SCORE_RECOVERY_ALPHA);
  const balanceScore = Math.max(0, Math.min(100, Math.round(state.smoothedLRBalance)));

  // --- Step 7: Front-Back Stability Score ---
  const fbPenaltyScore = computePenalty(Math.abs(fbDiff), DEAD_ZONE, MILD_THRESHOLD, STRONG_THRESHOLD, 50);
  const targetFB = Math.max(0, Math.min(100, Math.round(100 - fbPenaltyScore * 2)));
  state.smoothedFBBalance = ema(state.smoothedFBBalance, targetFB, SCORE_RECOVERY_ALPHA);
  const fbBalanceScore = Math.max(0, Math.min(100, Math.round(state.smoothedFBBalance)));

  return {
    status,
    label,
    score,
    balanceScore,
    fbBalanceScore,
    explanation,
    recommendations,
    fbImbalance: normalizedFB,
    lrImbalance: normalizedLR,
  };
}

// ============================================================
// Mock data generator — produces realistic, calm variation
// ============================================================

const DEMO_CYCLE_DURATION = 4000; // 4 seconds per direction
const DEMO_PHASES: Array<"left" | "right" | "front" | "back"> = ["left", "right", "front", "back"];
let demoStartTime: number | null = null;

export function generateMockData(): PressureData {
  if (demoStartTime === null) demoStartTime = Date.now();
  const elapsed = Date.now() - demoStartTime;
  const phaseIndex = Math.floor(elapsed / DEMO_CYCLE_DURATION) % DEMO_PHASES.length;
  const currentPhase = DEMO_PHASES[phaseIndex];

  const noise = () => (Math.random() - 0.5) * 0.1;
  const high = 5.0 + noise();
  const low = 1.0 + noise();
  const neutral = 3.0 + noise();

  let front = neutral, back = neutral, left = neutral, right = neutral;

  switch (currentPhase) {
    case "left":
      left = high; right = low;
      break;
    case "right":
      right = high; left = low;
      break;
    case "front":
      front = high; back = low;
      break;
    case "back":
      back = high; front = low;
      break;
  }

  return {
    front: Math.max(0, parseFloat(front.toFixed(2))),
    back: Math.max(0, parseFloat(back.toFixed(2))),
    left: Math.max(0, parseFloat(left.toFixed(2))),
    right: Math.max(0, parseFloat(right.toFixed(2))),
    timestamp: Date.now(),
  };
}

export function resetDemoTimer() {
  demoStartTime = null;
}
