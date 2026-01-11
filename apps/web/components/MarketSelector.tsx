'use client'
import { CandleInterval } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
// import { Ticker } from '@/hooks/useBackpackTicker';
import { Ticker } from '@/hooks/useMarketFeed';

interface TradingPair {
  symbol: string;
  name: string;
}

const TRADING_PAIRS: TradingPair[] = [
  { symbol: 'BTCUSDC', name: 'BTC-USDC' },
  { symbol: 'ETHUSDC', name: 'ETH-USDC' },
  { symbol: 'SOLUSDC', name: 'SOL-USDC' },
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
  ticker: Ticker ; 
  currentPrice?: number;
  // priceChange24h?: number;
  onPairChange: (symbol: string) => void;
  onTimeframeChange: (timeframe: CandleInterval) => void;
}

export function MarketSelector({
  selectedPair,
  selectedTimeframe,
  ticker,
  // priceChange24h,
  onPairChange,
  onTimeframeChange,
}: MarketSelectorProps) {


  // const { base, quote } = getMarketDetails(selectedPair);
  // const isPositiveChange = (priceChange24h ?? 0) >= 0;

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
          {/* Live Price */}
          <div>           
            <div className="flex flex-col">
            <span className="text-2xl font-bold font-mono tracking-tight">
              ${(ticker?.lastPrice || 0).toLocaleString(undefined)}
            </span>
            <div className="flex gap-3 text-xs font-mono text-muted-foreground">
               <span className="text-green-500">B: {ticker?.bestBid}</span>
               <span className="text-red-500">A: {ticker?.bestAsk}</span>
            </div>
         </div>
       </div>
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









// 'use client'
// import { CandleInterval } from '@/lib/api';
// import { cn, getMarketDetails } from '@/lib/utils';
// import { Button } from '@/components/ui/button';
// import { Ticker } from '@/hooks/useBackpackTicker';

// interface MarketSelectorProps {
//   selectedPair: string; // "BTC_USDC"
//   selectedTimeframe: CandleInterval;
//   ticker: Ticker | null; // Live WebSocket Data
//   onPairChange: (symbol: string) => void;
//   onTimeframeChange: (timeframe: CandleInterval) => void;
// }

// const MARKETS = ["BTC_USDC", "ETH_USDC", "SOL_USDC"];

// export function MarketSelector({
//   selectedPair,
//   selectedTimeframe,
//   ticker,
//   onPairChange,
//   onTimeframeChange,
// }: MarketSelectorProps) {
  
//   const { base, quote } = getMarketDetails(selectedPair);

//   return (
//     <div className="bg-card border border-border rounded-lg p-3 mb-4">
//       <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        
//         {/* Left: Ticker Info */}
//         <div className="flex items-center gap-6 w-full md:w-auto">
//           {/* Pair Selector */}
//           <div className="flex gap-1 bg-secondary/20 p-1 rounded-lg">
//             {MARKETS.map((m) => (
//               <button
//                 key={m}
//                 onClick={() => onPairChange(m)}
//                 className={cn(
//                   "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
//                   selectedPair === m 
//                     ? "bg-background shadow text-foreground" 
//                     : "text-muted-foreground hover:text-foreground"
//                 )}
//               >
//                 {getMarketDetails(m).base}
//               </button>
//             ))}
//           </div>

//           {/* Live Price */}
//           <div className="flex flex-col">
//             <span className="text-2xl font-bold font-mono tracking-tight">
//               ${(ticker?.lastPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
//             </span>
//             <div className="flex gap-3 text-xs font-mono text-muted-foreground">
//                <span className="text-green-500">B: {ticker?.bestBid}</span>
//                <span className="text-red-500">A: {ticker?.bestAsk}</span>
//             </div>
//           </div>
//         </div>

//         {/* Right: Timeframes (Optional, keeping your existing logic) */}
//         <div className="flex gap-1">
//            {/* ... existing timeframe buttons ... */}
//         </div>
//       </div>
//     </div>
//   );
// }