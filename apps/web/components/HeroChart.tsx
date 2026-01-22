"use client";

import { createChart, CandlestickData, CandlestickSeries } from "lightweight-charts";
import { useEffect, useRef } from "react";

const data: CandlestickData[] = [
  { time: "2024-01-01", open: 120, high: 135, low: 115, close: 130 },
  { time: "2024-01-02", open: 130, high: 138, low: 125, close: 128 },
  { time: "2024-01-03", open: 128, high: 140, low: 126, close: 136 },
  { time: "2024-01-04", open: 136, high: 145, low: 132, close: 142 },
  { time: "2024-01-05", open: 142, high: 150, low: 138, close: 146 },
];

export function HeroChart() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const chart = createChart(ref.current, {
      height: 420,
      layout: {
        background: { color: "transparent" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.05)" },
        horzLines: { color: "rgba(255,255,255,0.05)" },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      borderVisible: false,
    });

    series.setData(data);
    chart.timeScale().fitContent();

    return () => chart.remove();
  }, []);

  return (
    <div className="rounded-2xl border border-border/40 bg-background/60 backdrop-blur-xl p-4 shadow-2xl">
      <div ref={ref} />
    </div>
  );
}