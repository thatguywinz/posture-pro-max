import { useState, useEffect, useCallback, useRef } from "react";
import { PressureData, PostureAnalysis, SessionStats, analyzePosture, generateMockData, parseSerialData } from "@/lib/posture";

const MAX_HISTORY = 600;

type ConnectionMode = "disconnected" | "demo" | "serial";

export function usePostureMonitor() {
  const [mode, setMode] = useState<ConnectionMode>("disconnected");
  const [current, setCurrent] = useState<PressureData | null>(null);
  const [analysis, setAnalysis] = useState<PostureAnalysis | null>(null);
  const [history, setHistory] = useState<PressureData[]>([]);
  const [calibration, setCalibration] = useState<PressureData | undefined>();
  const [serialError, setSerialError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionStats>({
    startTime: Date.now(),
    balancedTime: 0,
    totalTime: 0,
    warningCount: 0,
    longestBalancedStreak: 0,
    currentBalancedStreak: 0,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isDemo = mode === "demo";
  const isConnected = mode !== "disconnected";
  const isSerial = mode === "serial";

  const processData = useCallback((data: PressureData) => {
    setCurrent(data);

    const result = analyzePosture(data, calibration);
    setAnalysis(result);

    setHistory(prev => {
      const next = [...prev, data];
      return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
    });

    setSession(prev => {
      const elapsed = 0.5;
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

  // Demo mode
  const startDemo = useCallback(() => {
    disconnectSerial();
    if (intervalRef.current) clearInterval(intervalRef.current);
    setMode("demo");
    setSerialError(null);
    intervalRef.current = setInterval(() => {
      processData(generateMockData());
    }, 500);
  }, [processData]);

  const stopDemo = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setMode("disconnected");
  }, []);

  const toggleDemo = useCallback(() => {
    if (isDemo) stopDemo();
    else startDemo();
  }, [isDemo, startDemo, stopDemo]);

  // Serial reading loop
  async function readSerialLoop(port: any) {
    const textDecoder = new TextDecoderStream();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const readableStreamClosed = (port.readable as ReadableStream).pipeTo(textDecoder.writable as any, { signal: abortController.signal }).catch(() => {});
    const reader = textDecoder.readable.getReader();
    readerRef.current = reader;

    let buffer = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const parsed = parseSerialData(trimmed);
          if (parsed) {
            processData(parsed);
          }
        }
      }
    } catch (err) {
      // Reader cancelled or port disconnected
    } finally {
      reader.releaseLock();
      await readableStreamClosed;
    }
  }

  // Connect to Arduino
  const connectSerial = useCallback(async () => {
    const nav = navigator as any;
    if (!nav.serial) {
      setSerialError("Web Serial API not supported. Use Chrome or Edge.");
      return;
    }

    try {
      // Stop demo if running
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setSerialError(null);

      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 });
      portRef.current = port;
      setMode("serial");

      readSerialLoop(port).catch(() => {
        setSerialError("Serial connection lost.");
        setMode("disconnected");
      });

      // Listen for disconnect
      port.addEventListener("disconnect", () => {
        setSerialError("Arduino disconnected.");
        setMode("disconnected");
        portRef.current = null;
      });
    } catch (err: any) {
      if (err.name === "NotFoundError") {
        return; // User cancelled the port picker
      }
      if (err.message?.includes("permissions policy") || err.name === "SecurityError") {
        setSerialError("Serial access blocked in this context. Open the app directly in Chrome/Edge (not in an iframe) to connect.");
      } else {
        setSerialError(err.message || "Failed to connect to serial port.");
      }
    }
  }, [processData]);

  // Disconnect serial
  const disconnectSerial = useCallback(async () => {
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (readerRef.current) {
        readerRef.current = null;
      }
      if (portRef.current) {
        await portRef.current.close().catch(() => {});
        portRef.current = null;
      }
    } catch {
      // ignore cleanup errors
    }
    setMode("disconnected");
  }, []);

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
      disconnectSerial();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    current,
    analysis,
    history,
    session,
    isDemo,
    isConnected,
    isSerial,
    serialError,
    calibration,
    toggleDemo,
    connectSerial,
    disconnectSerial,
    calibrate,
    resetSession,
    processData,
  };
}
