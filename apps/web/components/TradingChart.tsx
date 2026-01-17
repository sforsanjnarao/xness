'use client'
import { useEffect, useRef } from 'react';
import { createChart, IChartApi, CandlestickData, Time, CandlestickSeries } from 'lightweight-charts';
import { Candle } from '@/lib/api';

interface TradingChartProps {
  candles: Candle[];
  isLoading?: boolean;
}

export function TradingChart({ candles, isLoading }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#8B8B8B',
      },
      grid: {
        vertLines: { color: '#2A2A2B' },
        horzLines: { color: '#2A2A2B' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#8B8B8B',
          labelBackgroundColor: '#1A1A1B',
        },
        horzLine: {
          color: '#8B8B8B',
          labelBackgroundColor: '#1A1A1B',
        },
      },
      rightPriceScale: {
        borderColor: '#2A2A2B',
      },
      timeScale: {
        borderColor: '#2A2A2B',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22C55E',
      downColor: '#EF4444',
      borderUpColor: '#22C55E',
      borderDownColor: '#EF4444',
      wickUpColor: '#22C55E',
      wickDownColor: '#EF4444',
    });

    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    // Update data when candles change
    if (candles.length > 0) {
      const chartData: CandlestickData<Time>[] = candles
        .map((candle) => {
          // 1. Convert the Backend Date String to a Javascript Date Object
          const date = new Date(candle.time);
          
          // 2. Convert to Unix Timestamp in SECONDS (Lightweight charts needs seconds, JS gives milliseconds)
          // If the date is invalid (NaN), fallback to 0 to prevent crash
          const unixTime = Math.floor(date.getTime() / 1000);

          return {
            time: unixTime as Time, // Cast as Time type
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          };
        })
        // 3. Lightweight Charts requires data to be sorted by time (Ascending)
        // This prevents errors if backend sends data out of order
        .sort((a, b) => (a.time as number) - (b.time as number));

      // 4. Set the data
      candlestickSeries.setData(chartData);
      chart.timeScale();
    }


    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [candles]);

  return (
    <div className="relative w-full h-full min-h-[400px] bg-card rounded-lg border border-border overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
        </div>
      )}
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
}
