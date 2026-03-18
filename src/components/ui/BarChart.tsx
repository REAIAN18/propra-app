"use client";

interface BarChartProps {
  data: { label: string; value: number; benchmark?: number }[];
  currency?: string;
  height?: number;
  color?: string;
  benchmarkColor?: string;
  formatValue?: (v: number) => string;
}

export function BarChart({
  data,
  height = 160,
  color = "#0A8A4C",
  benchmarkColor = "#1647E8",
  formatValue,
}: BarChartProps) {
  const allValues = data.flatMap((d) => [d.value, d.benchmark ?? 0]);
  const max = Math.max(...allValues) * 1.1;

  const fmt = formatValue ?? ((v: number) => v.toLocaleString());

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-end gap-2 sm:gap-3" style={{ height, minWidth: data.length > 4 ? data.length * 60 : undefined }}>
        {data.map((d) => {
          const barH = (d.value / max) * (height - 36);
          const benchH = d.benchmark ? (d.benchmark / max) * (height - 36) : 0;
          return (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-1" style={{ minWidth: 44 }}>
              <div
                className="w-full flex items-end gap-0.5 sm:gap-1"
                style={{ height: height - 36 }}
              >
                <div
                  className="flex-1 rounded-t transition-all"
                  style={{ height: barH, backgroundColor: color, minHeight: 2 }}
                />
                {d.benchmark !== undefined && (
                  <div
                    className="flex-1 rounded-t transition-all"
                    style={{ height: benchH, backgroundColor: benchmarkColor, minHeight: 2, opacity: 0.7 }}
                  />
                )}
              </div>
              <div className="text-center truncate w-full px-0.5" style={{ color: "#5a7a96", fontSize: 10 }}>
                {d.label}
              </div>
              <div className="hidden sm:block text-center font-medium" style={{ color: "#e8eef5", fontSize: 11 }}>
                {fmt(d.value)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
