// Mock historical posture data generator

export type Timeframe = "1d" | "1w" | "1m" | "6m";

export interface HistoricalDataPoint {
  timestamp: number;
  postureScore: number;
  lrBalance: number;
  fbStability: number;
  sessionMinutes: number;
}

export interface HistoricalSummary {
  avgPostureScore: number;
  avgLRBalance: number;
  avgFBStability: number;
  totalSessions: number;
  totalHours: number;
  bestDay: string;
  worstDay: string;
  improvementPercent: number;
  balancedPercent: number;
  leanLeftPercent: number;
  leanRightPercent: number;
  leanForwardPercent: number;
  leanBackPercent: number;
}

export interface HistoricalInsight {
  type: "positive" | "warning" | "info";
  title: string;
  description: string;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateHistoricalData(timeframe: Timeframe): HistoricalDataPoint[] {
  const now = Date.now();
  const points: HistoricalDataPoint[] = [];
  
  const config = {
    "1d": { count: 48, interval: 30 * 60 * 1000 },      // every 30 min
    "1w": { count: 56, interval: 3 * 60 * 60 * 1000 },   // every 3 hours
    "1m": { count: 60, interval: 12 * 60 * 60 * 1000 },   // every 12 hours
    "6m": { count: 72, interval: 2.5 * 24 * 60 * 60 * 1000 }, // every 2.5 days
  };

  const { count, interval } = config[timeframe];
  const rand = seededRandom(timeframe.length * 1337);

  // Simulate gradual improvement over time
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const improvement = t * 12; // scores improve over time
    const timeOfDay = (i % 24) / 24;
    const fatigueDip = timeOfDay > 0.6 ? (timeOfDay - 0.6) * 15 : 0;
    
    points.push({
      timestamp: now - (count - i) * interval,
      postureScore: Math.min(100, Math.max(20, 58 + improvement + (rand() - 0.5) * 25 - fatigueDip)),
      lrBalance: Math.min(100, Math.max(15, 62 + improvement * 0.8 + (rand() - 0.5) * 22)),
      fbStability: Math.min(100, Math.max(18, 55 + improvement * 0.6 + (rand() - 0.5) * 28 - fatigueDip * 0.7)),
      sessionMinutes: Math.round(25 + rand() * 90),
    });
  }

  return points;
}

export function generateSummary(data: HistoricalDataPoint[]): HistoricalSummary {
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  
  const scores = data.map(d => d.postureScore);
  const lrScores = data.map(d => d.lrBalance);
  const fbScores = data.map(d => d.fbStability);
  
  const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
  const secondHalf = scores.slice(Math.floor(scores.length / 2));
  const improvement = avg(secondHalf) - avg(firstHalf);

  // Find best/worst days
  const dayScores = new Map<string, number[]>();
  data.forEach(d => {
    const day = new Date(d.timestamp).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    if (!dayScores.has(day)) dayScores.set(day, []);
    dayScores.get(day)!.push(d.postureScore);
  });

  let bestDay = "", worstDay = "";
  let bestAvg = 0, worstAvg = 100;
  dayScores.forEach((scores, day) => {
    const a = avg(scores);
    if (a > bestAvg) { bestAvg = a; bestDay = day; }
    if (a < worstAvg) { worstAvg = a; worstDay = day; }
  });

  return {
    avgPostureScore: Math.round(avg(scores)),
    avgLRBalance: Math.round(avg(lrScores)),
    avgFBStability: Math.round(avg(fbScores)),
    totalSessions: data.length,
    totalHours: Math.round(data.reduce((s, d) => s + d.sessionMinutes, 0) / 60),
    bestDay,
    worstDay,
    improvementPercent: Math.round(improvement * 10) / 10,
    balancedPercent: 42,
    leanLeftPercent: 15,
    leanRightPercent: 13,
    leanForwardPercent: 22,
    leanBackPercent: 8,
  };
}

export function generateInsights(summary: HistoricalSummary, timeframe: Timeframe): HistoricalInsight[] {
  const insights: HistoricalInsight[] = [];

  if (summary.improvementPercent > 3) {
    insights.push({
      type: "positive",
      title: "Posture improving",
      description: `Your posture score has improved by ${summary.improvementPercent.toFixed(1)}% over this period. Keep up the consistent effort.`,
    });
  } else if (summary.improvementPercent < -3) {
    insights.push({
      type: "warning",
      title: "Posture declining",
      description: `Scores have dropped ${Math.abs(summary.improvementPercent).toFixed(1)}% recently. Consider taking more frequent breaks.`,
    });
  }

  if (summary.leanForwardPercent > 20) {
    insights.push({
      type: "warning",
      title: "Frequent forward leaning",
      description: `You spent ${summary.leanForwardPercent}% of your time leaning forward. This can strain your lower back over time. Try adjusting your monitor height.`,
    });
  }

  if (summary.avgLRBalance > 70) {
    insights.push({
      type: "positive",
      title: "Strong left-right balance",
      description: "Your lateral weight distribution is consistently balanced, reducing risk of uneven spinal loading.",
    });
  } else {
    insights.push({
      type: "info",
      title: "Left-right balance could improve",
      description: `Average L/R balance is ${summary.avgLRBalance}%. Try centering your weight evenly across both hips.`,
    });
  }

  insights.push({
    type: "info",
    title: `${summary.totalHours} hours tracked`,
    description: `Across ${summary.totalSessions} sessions this ${timeframe === "1d" ? "day" : timeframe === "1w" ? "week" : timeframe === "1m" ? "month" : "period"}. Consistent tracking helps identify patterns.`,
  });

  if (summary.avgPostureScore >= 70) {
    insights.push({
      type: "positive",
      title: "Above-average posture",
      description: "Your average score is in the good range. Maintaining this reduces long-term back pain risk.",
    });
  }

  return insights;
}
