import { useState, useEffect, useCallback, useRef } from "react";
import { PressureData, PostureAnalysis, SessionStats, analyzePosture, generateMockData } from "@/lib/posture";

const MAX_HISTORY = 600; // 5 min at 500ms intervals

export function usePostureMonitor() {
  const [isDemo, setIsDemo] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [current, setCurrent] = useState<PressureData | null>(null);
  const [analysis, setAnalysis] = useState<PostureAnalysis | null>(null);
  const [history, setHistory] = useState<PressureData[]>([]);
  const [calibration, setCalibration] = useState<PressureData | undefined>();
  const [session, setSession] = useState<SessionStats>({
    startTime: Date.now(),
    balancedTime: 0,
    totalTime: 0,
    warningCount: 0,
    longestBalancedStreak: 0,
    currentBalancedStreak: 0,
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const processData = useCallback((data: PressureData) => {
    setCurrent(data);
    const result = analyzePosture(data, calibration);
    setAnalysis(result);

    setHistory(prev => {
      const next = [...prev, data];
      return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
    });

    setSession(prev => {
      const elapsed = 0.5; // seconds per tick
      const isBalanced = result.status === "balanced";
      const isWarning = result.status === "slouch-risk" || result.status === "leaning-forward" || result.status === "leaning-backward";
      const newStreak = isBalanced ? prev.currentBalancedStreak + elapsed : 0;
      return {
        ...prev,
        totalTime: prev.totalTime + elapsed,
        balancedTime: prev.balancedTime + (isBalanced ? elapsed : 0),
        warningCount: prev.warningCount + (isWarning ? 1 : 0),
        longestBalancedStreak: Math.max(prev.longestBalancedStreak, newStreak),
        currentBalancedStreak: newStreak,
      };
    });
  }, [calibration]);

  const startDemo = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsDemo(true);
    setIsConnected(true);
    intervalRef.current = setInterval(() => {
      processData(generateMockData());
    }, 500);
  }, [processData]);

  const stopDemo = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setIsDemo(false);
    setIsConnected(false);
  }, []);

  const toggleDemo = useCallback(() => {
    if (isDemo) stopDemo();
    else startDemo();
  }, [isDemo, startDemo, stopDemo]);

  const calibrate = useCallback(() => {
    if (current) setCalibration({ ...current, timestamp: Date.now() });
  }, [current]);

  const resetSession = useCallback(() => {
    setSession({
      startTime: Date.now(),
      balancedTime: 0,
      totalTime: 0,
      warningCount: 0,
      longestBalancedStreak: 0,
      currentBalancedStreak: 0,
    });
    setHistory([]);
  }, []);

  useEffect(() => {
    startDemo();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    current,
    analysis,
    history,
    session,
    isDemo,
    isConnected,
    calibration,
    toggleDemo,
    calibrate,
    resetSession,
    processData,
  };
}
