'use client'
import { CandleInterval } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface TradingPair {
  symbol: string;
  name: string;
}

const TRADING_PAIRS: TradingPair[] = [
  { symbol: 'BTC_USDC', name: 'BTC-PERP' },
  { symbol: 'ETH_USDC', name: 'ETH-PERP' },
  { symbol: 'SOL_USDC', name: 'SOL-PERP' },
];

const TIMEFRAMES: { value: CandleInterval; label: string }[] = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
  { value: '1d', label: '1D' },
];

interface MarketSelectorProps {
  selectedPair: string;
  selectedTimeframe: CandleInterval;
  currentPrice?: number;
  priceChange24h?: number;
  onPairChange: (symbol: string) => void;
  onTimeframeChange: (timeframe: CandleInterval) => void;
}

export function MarketSelector({
  selectedPair,
  selectedTimeframe,
  currentPrice,
  priceChange24h,
  onPairChange,
  onTimeframeChange,
}: MarketSelectorProps) {
  const isPositiveChange = (priceChange24h ?? 0) >= 0;

  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Trading Pairs */}
          <div className="flex gap-1">
            {TRADING_PAIRS.map((pair) => (
              <Button
                key={pair.symbol}
                variant={selectedPair === pair.symbol ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onPairChange(pair.symbol)}
                className={cn(
                  'text-sm',
                  selectedPair === pair.symbol && 'bg-primary text-primary-foreground'
                )}
              >
                {pair.name}
              </Button>
            ))}
          </div>

          {/* Price Display */}
          {currentPrice && (
            <div className="flex items-center gap-3 pl-4 border-l border-border">
              <span className="text-xl font-bold">${currentPrice.toLocaleString()}</span>
              {priceChange24h !== undefined && (
                <span
                  className={cn(
                    'text-sm font-medium',
                    isPositiveChange ? 'text-long' : 'text-short'
                  )}
                >
                  {isPositiveChange ? '+' : ''}{priceChange24h.toFixed(2)}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Timeframes */}
        <div className="flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <Button
              key={tf.value}
              variant={selectedTimeframe === tf.value ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onTimeframeChange(tf.value)}
              className="text-xs px-2"
            >
              {tf.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
