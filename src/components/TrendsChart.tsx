import { useState, useMemo } from "react";
import { PressureData } from "@/lib/posture";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface TrendsChartProps {
  history: PressureData[];
}

const TIME_RANGES = [
  { label: "30s", seconds: 30 },
  { label: "1m", seconds: 60 },
  { label: "5m", seconds: 300 },
];

export default function TrendsChart({ history }: TrendsChartProps) {
  const [range, setRange] = useState(30);

  const data = useMemo(() => {
    const cutoff = Date.now() - range * 1000;
    return history
      .filter((d) => d.timestamp >= cutoff)
      .map((d, i) => ({
        time: i * 0.5,
        Front: d.front,
        Back: d.back,
        Left: d.left,
        Right: d.right,
      }));
  }, [history, range]);

  return (
    <div className="glass p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Voltage Trends</h3>
        <div className="flex gap-1">
          {TIME_RANGES.map((r) => (
            <button
              key={r.seconds}
              onClick={() => setRange(r.seconds)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                range === r.seconds
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,16%,18%)" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(215,15%,55%)" }} tickFormatter={(v) => `${v}s`} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(215,15%,55%)" }} domain={[0, 'auto']} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(220,18%,10%)",
                border: "1px solid hsl(220,16%,22%)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "11px" }} />
            <Line type="monotone" dataKey="Front" stroke="hsl(174,72%,50%)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Back" stroke="hsl(160,60%,45%)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Left" stroke="hsl(38,92%,55%)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Right" stroke="hsl(280,60%,60%)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
