import { motion } from "framer-motion";
import { usePostureMonitor } from "@/hooks/usePostureMonitor";
import SeatVisualization from "@/components/SeatVisualization";
import PostureAnalysisCard from "@/components/PostureAnalysisCard";
import RecommendationsPanel from "@/components/RecommendationsPanel";
import MetricsCards from "@/components/MetricsCards";
import TrendsChart from "@/components/TrendsChart";
import SessionInsights from "@/components/SessionInsights";
import PostureAlert from "@/components/PostureAlert";
import { Activity, RotateCcw, Play, Pause, Info, Usb, Unplug } from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const Index = () => {
  const {
    current, analysis, history, session,
    isDemo, isConnected, isSerial, serialError,
    toggleDemo, connectSerial, disconnectSerial, calibrate, resetSession,
  } = usePostureMonitor();

  const [showOnboarding, setShowOnboarding] = useState(false);

  const connectionStatus = isSerial
    ? "Arduino Connected"
    : isDemo ? "Demo Mode" : "Waiting for Data";

  const statusColor = isSerial
    ? "bg-glow-good/20 text-glow-good border-glow-good/30"
    : isConnected
      ? "bg-primary/20 text-primary border-primary/30"
      : "bg-glow-warning/20 text-glow-warning border-glow-warning/30";

  return (
    <div className="min-h-screen bg-background px-4 py-6 md:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero Header */}
        <motion.header
          className="space-y-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center glow-primary">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                  Posture Pressure Monitor
                </h1>
                <p className="text-sm text-muted-foreground">
                  Real-time seat pressure intelligence for healthier spinal alignment
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-3 py-1 text-xs font-medium rounded-full border ${statusColor}`}>
                {connectionStatus}
              </span>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowOnboarding(!showOnboarding)}
                    className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Quadrant guide</TooltipContent>
              </Tooltip>

              <button
                onClick={calibrate}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Calibrate
              </button>

              <button
                onClick={resetSession}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
              >
                Reset Session
              </button>

              <button
                onClick={toggleDemo}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors flex items-center gap-1.5"
              >
                {isDemo ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isDemo ? "Stop Demo" : "Start Demo"}
              </button>
            </div>
          </div>

          {/* Onboarding tooltip */}
          {showOnboarding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="glass p-4 text-sm text-muted-foreground space-y-1"
            >
              <p className="font-medium text-foreground">Quadrant Guide</p>
              <p><strong className="text-primary">Front (A0)</strong> — Front edge of seat, detects forward lean</p>
              <p><strong className="text-primary">Back (A1)</strong> — Rear of seat, detects backward lean</p>
              <p><strong className="text-primary">Left (A2)</strong> — Left side, detects lateral tilt</p>
              <p><strong className="text-primary">Right (A3)</strong> — Right side, detects lateral tilt</p>
              <p className="text-xs pt-1">Higher voltage = more pressure on that zone. Balanced readings = good posture.</p>
            </motion.div>
          )}
        </motion.header>

        {/* Alert */}
        <PostureAlert analysis={analysis} />

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left column */}
          <div className="lg:col-span-4 space-y-6">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <SeatVisualization data={current} />
            </motion.div>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <PostureAnalysisCard analysis={analysis} />
            </motion.div>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <RecommendationsPanel analysis={analysis} />
            </motion.div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-8 space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <MetricsCards data={current} analysis={analysis} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <TrendsChart history={history} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <SessionInsights session={session} />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
