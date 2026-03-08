import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, TrendingUp, TrendingDown, Clock, Target, Calendar, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import {
  Timeframe,
  generateHistoricalData,
  generateSummary,
  generateInsights,
  HistoricalInsight,
} from "@/lib/historicalData";

const TIMEFRAME_OPTIONS: { value: Timeframe; label: string }[] = [
  { value: "1d", label: "Past Day" },
  { value: "1w", label: "Past Week" },
  { value: "1m", label: "Past Month" },
  { value: "6m", label: "Past 6 Months" },
];

const SCORE_COLORS = {
  posture: "hsl(174, 72%, 50%)",
  lrBalance: "hsl(160, 60%, 45%)",
  fbStability: "hsl(38, 92%, 55%)",
};

const PIE_COLORS = [
  "hsl(145, 65%, 48%)",  // balanced - green
  "hsl(200, 70%, 55%)",  // left
  "hsl(270, 60%, 55%)",  // right
  "hsl(38, 92%, 55%)",   // forward
  "hsl(0, 72%, 55%)",    // back
];

function formatTimestamp(ts: number, tf: Timeframe): string {
  const d = new Date(ts);
  if (tf === "1d") return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  if (tf === "1w") return d.toLocaleDateString("en-US", { weekday: "short", hour: "numeric" });
  if (tf === "1m") return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ScoreRing({ score, label, color, size = 120 }: { score: number; label: string; color: string; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(220, 16%, 18%)" strokeWidth="8" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-2xl font-bold text-foreground">{score}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">/100</span>
      </div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

function InsightCard({ insight }: { insight: HistoricalInsight }) {
  const iconColors = {
    positive: "text-glow-good bg-glow-good/10 border-glow-good/20",
    warning: "text-glow-warning bg-glow-warning/10 border-glow-warning/20",
    info: "text-primary bg-primary/10 border-primary/20",
  };

  return (
    <div className={`glass p-4 flex items-start gap-3 border ${iconColors[insight.type].split(" ").slice(2).join(" ")}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconColors[insight.type]}`}>
        {insight.type === "positive" ? <TrendingUp className="w-4 h-4" /> :
         insight.type === "warning" ? <TrendingDown className="w-4 h-4" /> :
         <Activity className="w-4 h-4" />}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{insight.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
      </div>
    </div>
  );
}

export default function History() {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState<Timeframe>("1w");
  const reportRef = useRef<HTMLDivElement>(null);

  const data = generateHistoricalData(timeframe);
  const summary = generateSummary(data);
  const insights = generateInsights(summary, timeframe);

  const chartData = data.map(d => ({
    time: formatTimestamp(d.timestamp, timeframe),
    posture: Math.round(d.postureScore),
    lrBalance: Math.round(d.lrBalance),
    fbStability: Math.round(d.fbStability),
  }));

  const pieData = [
    { name: "Balanced", value: summary.balancedPercent },
    { name: "Lean Left", value: summary.leanLeftPercent },
    { name: "Lean Right", value: summary.leanRightPercent },
    { name: "Lean Forward", value: summary.leanForwardPercent },
    { name: "Lean Back", value: summary.leanBackPercent },
  ];

  const handleExportPDF = useCallback(async () => {
    const el = reportRef.current;
    if (!el) return;
    
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    const canvas = await html2canvas(el, {
      backgroundColor: "#101318",
      scale: 2,
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    // Handle multi-page
    const pageHeight = pdf.internal.pageSize.getHeight();
    let position = 0;

    if (pdfHeight <= pageHeight) {
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    } else {
      let remaining = pdfHeight;
      while (remaining > 0) {
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        remaining -= pageHeight;
        position -= pageHeight;
        if (remaining > 0) pdf.addPage();
      }
    }

    const tfLabel = TIMEFRAME_OPTIONS.find(t => t.value === timeframe)?.label ?? timeframe;
    pdf.save(`PosturePro_Report_${tfLabel.replace(/\s/g, "_")}.pdf`);
  }, [timeframe]);

  return (
    <div className="min-h-screen bg-background px-4 py-6 md:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto space-y-6" ref={reportRef}>
        {/* Header */}
        <motion.header
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Historical Analytics</h1>
              <p className="text-sm text-muted-foreground">Long-term posture trends and insights</p>
            </div>
          </div>

          <button
            onClick={handleExportPDF}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors flex items-center gap-2 self-end sm:self-auto"
          >
            <Download className="w-4 h-4" /> Export Full Report
          </button>
        </motion.header>

        {/* Timeframe selector */}
        <motion.div
          className="flex gap-2 flex-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {TIMEFRAME_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setTimeframe(opt.value)}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                timeframe === opt.value
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "bg-secondary/50 text-muted-foreground border-glass-border hover:bg-secondary"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </motion.div>

        {/* Score rings */}
        <motion.div
          className="glass p-6 glow-primary"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-6">Average Scores</h3>
          <div className="flex flex-wrap justify-center gap-10">
            <div className="relative">
              <ScoreRing score={summary.avgPostureScore} label="Posture" color={SCORE_COLORS.posture} size={130} />
            </div>
            <div className="relative">
              <ScoreRing score={summary.avgLRBalance} label="L/R Balance" color={SCORE_COLORS.lrBalance} size={130} />
            </div>
            <div className="relative">
              <ScoreRing score={summary.avgFBStability} label="F/B Stability" color={SCORE_COLORS.fbStability} size={130} />
            </div>
          </div>
        </motion.div>

        {/* Main chart */}
        <motion.div
          className="glass p-6 glow-primary"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Posture Scores Over Time</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gradPosture" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SCORE_COLORS.posture} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={SCORE_COLORS.posture} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 18%)" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(215, 15%, 55%)" }} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(215, 15%, 55%)" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 16%, 22%)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "hsl(210, 20%, 95%)" }}
                />
                <Area type="monotone" dataKey="posture" stroke={SCORE_COLORS.posture} strokeWidth={2} fill="url(#gradPosture)" name="Posture" />
                <Line type="monotone" dataKey="lrBalance" stroke={SCORE_COLORS.lrBalance} strokeWidth={1.5} dot={false} name="L/R Balance" />
                <Line type="monotone" dataKey="fbStability" stroke={SCORE_COLORS.fbStability} strokeWidth={1.5} dot={false} name="F/B Stability" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Two-column: Pie + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Position distribution pie */}
          <motion.div
            className="glass p-6 glow-primary"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
          >
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Position Distribution</h3>
            <div className="h-[250px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 16%, 22%)", borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => [`${value}%`, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                  {d.name} ({d.value}%)
                </div>
              ))}
            </div>
          </motion.div>

          {/* Seated Pressure Summary */}
          <motion.div
            className="glass p-6 glow-primary"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
          >
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Seated Pressure Summary</h3>
            <div className="space-y-4">
              {[
                { icon: Target, label: "Avg Posture Score", value: `${summary.avgPostureScore}/100`, color: "text-primary" },
                { icon: Clock, label: "Total Time Tracked", value: `${summary.totalHours} hrs`, color: "text-glow-accent" },
                { icon: Calendar, label: "Total Sessions", value: `${summary.totalSessions}`, color: "text-glow-warning" },
                { icon: TrendingUp, label: "Improvement", value: `${summary.improvementPercent > 0 ? "+" : ""}${summary.improvementPercent}%`, color: summary.improvementPercent >= 0 ? "text-glow-good" : "text-glow-danger" },
                { icon: Activity, label: "Best Day", value: summary.bestDay, color: "text-glow-good" },
                { icon: TrendingDown, label: "Worst Day", value: summary.worstDay, color: "text-glow-danger" },
              ].map(stat => (
                <div key={stat.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                  </div>
                  <span className={`text-sm font-semibold ${stat.color}`}>{stat.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Personalized Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight, i) => (
              <InsightCard key={i} insight={insight} />
            ))}
          </div>
        </motion.div>

        {/* Footer note for PDF */}
        <p className="text-[10px] text-muted-foreground/40 text-center pt-4">
          Generated by Posture Pro • {new Date().toLocaleDateString()} • Share this report with your healthcare provider
        </p>
      </div>
    </div>
  );
}
