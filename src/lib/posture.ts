export interface PressureData {
  front: number;
  back: number;
  left: number;
  right: number;
  timestamp: number;
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
  score: number;
  balanceScore: number;
  explanation: string;
  recommendations: string[];
  fbImbalance: number;
  lrImbalance: number;
}

export interface SessionStats {
  startTime: number;
  balancedTime: number;
  totalTime: number;
  warningCount: number;
  longestBalancedStreak: number;
  currentBalancedStreak: number;
}

const THRESHOLD = 0.25;
const SLOUCH_THRESHOLD = 0.35;

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

export function analyzePosture(data: PressureData, calibration?: PressureData): PostureAnalysis {
  let { front, back, left, right } = data;
  if (calibration) {
    front -= calibration.front;
    back -= calibration.back;
    left -= calibration.left;
    right -= calibration.right;
  }

  const total = front + back + left + right;
  const fbDiff = front - back;
  const lrDiff = left - right;
  const fbImbalance = total > 0 ? Math.abs(fbDiff) / (total / 2) : 0;
  const lrImbalance = total > 0 ? Math.abs(lrDiff) / (total / 2) : 0;

  let status: PostureStatus = "balanced";
  let label = "Balanced Posture";
  let explanation = "Your weight is evenly distributed. Great posture!";
  const recommendations: string[] = [];

  if (total < 0.5) {
    status = "unstable";
    label = "Unstable / Repositioning";
    explanation = "Very low pressure detected. You may be repositioning or not seated.";
    recommendations.push("Sit down firmly and center your weight.");
  } else if (fbDiff > SLOUCH_THRESHOLD && front > back * 1.5) {
    status = "slouch-risk";
    label = "Slouch Risk";
    explanation = "Significant forward pressure suggests you may be slouching. This increases lower-back strain.";
    recommendations.push("Sit back against the chair backrest.");
    recommendations.push("Engage your core to support your spine.");
  } else if (fbDiff > THRESHOLD) {
    status = "leaning-forward";
    label = "Leaning Forward";
    explanation = "More pressure on the front of the seat. You're leaning forward which can strain your lower back.";
    recommendations.push("Sit slightly back in the chair.");
    recommendations.push("Reduce forward lean to lower lower-back strain.");
  } else if (fbDiff < -THRESHOLD) {
    status = "leaning-backward";
    label = "Leaning Backward";
    explanation = "More pressure on the back of the seat. While reclining is okay briefly, sustained lean may indicate poor engagement.";
    recommendations.push("Sit upright with feet flat on the floor.");
  } else if (lrDiff > THRESHOLD) {
    status = "leaning-left";
    label = "Leaning Left";
    explanation = "More pressure on the left side. Uneven hip loading can cause discomfort over time.";
    recommendations.push("Shift weight evenly across both hips.");
    recommendations.push("Re-center posture.");
  } else if (lrDiff < -THRESHOLD) {
    status = "leaning-right";
    label = "Leaning Right";
    explanation = "More pressure on the right side. Try to balance your weight.";
    recommendations.push("Shift weight evenly across both hips.");
    recommendations.push("Re-center posture.");
  } else if (fbImbalance > 0.15 || lrImbalance > 0.15) {
    status = "uneven";
    label = "Uneven Distribution";
    explanation = "Pressure isn't severely off but could be more balanced.";
    recommendations.push("Make small adjustments to center your weight.");
  }

  if (status === "balanced") {
    recommendations.push("Good posture — maintain this position!");
  }

  // Score: 100 = perfect balance, drops with imbalance
  const imbalancePenalty = (fbImbalance + lrImbalance) * 50;
  const score = Math.max(0, Math.min(100, Math.round(100 - imbalancePenalty)));
  const balanceScore = Math.max(0, Math.min(100, Math.round(100 - (fbImbalance + lrImbalance) * 60)));

  return { status, label, score, balanceScore, explanation, recommendations, fbImbalance, lrImbalance };
}

export function generateMockData(): PressureData {
  const base = 1.0 + Math.random() * 0.5;
  const variance = () => (Math.random() - 0.5) * 0.6;
  // Add occasional posture changes
  const lean = Math.random();
  let front = base + variance();
  let back = base + variance();
  let left = base + variance();
  let right = base + variance();

  if (lean > 0.7) {
    front += 0.3 + Math.random() * 0.3; // lean forward
  } else if (lean > 0.55) {
    left += 0.25 + Math.random() * 0.2; // lean left
  } else if (lean > 0.4) {
    right += 0.25 + Math.random() * 0.2; // lean right
  }
  // else balanced

  return {
    front: Math.max(0, parseFloat(front.toFixed(2))),
    back: Math.max(0, parseFloat(back.toFixed(2))),
    left: Math.max(0, parseFloat(left.toFixed(2))),
    right: Math.max(0, parseFloat(right.toFixed(2))),
    timestamp: Date.now(),
  };
}
