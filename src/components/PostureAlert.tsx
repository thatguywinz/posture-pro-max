import { motion, AnimatePresence } from "framer-motion";
import { PostureAnalysis } from "@/lib/posture";
import { AlertTriangle } from "lucide-react";

interface PostureAlertProps {
  analysis: PostureAnalysis | null;
}

export default function PostureAlert({ analysis }: PostureAlertProps) {
  // Only show alert for genuinely poor posture (score < 35), not brief fluctuations
  const showAlert = analysis && analysis.score < 35;

  return (
    <AnimatePresence>
      {showAlert && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="glass border-glow-warning/30 p-4 flex items-center gap-3 glow-warning"
        >
          <AlertTriangle className="w-5 h-5 text-glow-warning shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Consider adjusting your position</p>
            <p className="text-xs text-muted-foreground">
              Sustained asymmetry detected — re-centering may improve comfort and reduce prolonged strain.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
