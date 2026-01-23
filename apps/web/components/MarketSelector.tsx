'use client'
import { useState, JSX } from 'react';
import { CandleInterval } from '@/lib/api';
import { cn, normalizeSymbol } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Ticker } from '@/hooks/useMarketFeed';
import { ChevronDown, ChevronUp, Clock, Coins } from 'lucide-react';

interface TradingPair {
  symbol: string;
  name: string;
}

const TRADING_PAIRS: TradingPair[] = [
  { symbol: 'BTC_USDC', name: 'BTC' },
  { symbol: 'ETH_USDC', name: 'ETH' },
  { symbol: 'SOL_USDC', name: 'SOL' },
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
  ticker?: Ticker | null; 
  onPairChange: (symbol: string) => void;
  onTimeframeChange: (timeframe: CandleInterval) => void;
}

export function MarketSelector({
  selectedPair,
  selectedTimeframe,
  ticker,
  onPairChange,
  onTimeframeChange,
}: MarketSelectorProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const currentPairName = TRADING_PAIRS.find(p => p.symbol === selectedPair)?.name || selectedPair;

  // Helper to close menu on selection (mobile only)
  const handlePairClick = (symbol: string) => {
    onPairChange(symbol);
    // Optional: Keep open if they might want to switch timeframe too, 
    // or close it immediately. Let's keep it open or let user close.
    // setIsOpen(false); 
  };

  const handleTimeframeClick = (tf: CandleInterval) => {
    onTimeframeChange(tf);
    setIsOpen(false); // Close on timeframe select is usually good UX
  };

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm transition-all duration-200">
      
      {/* 
        MOBILE HEADER (Visible only on mobile) 
        Acts as the Trigger for the collapsible
      */}
      <div 
        className="md:hidden flex items-center justify-between p-3 cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* Left: Ticker Info */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-sm font-bold flex items-center gap-2">
              {currentPairName}/USDC
              <span className="text-xs font-normal text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                {selectedTimeframe}
              </span>
            </span>
            <div className="flex items-center gap-2 mt-0.5">
               <span className={cn(
                  "text-base font-mono font-bold",
                  ticker?.dir === "up" ? "text-green-500" : ticker?.dir === "down" ? "text-red-500" : "text-foreground"
               )}>
                  ${(ticker?.lastPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
               </span>
            </div>
          </div>
        </div>

        {/* Right: Chevron */}
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>


      {/* 
        CONTENT AREA 
        - Hidden on mobile unless isOpen is true
        - Always flex-row on Desktop
      */}
      <div className={cn(
        "px-3 pb-3 md:p-3", // Mobile padding vs Desktop padding
        !isOpen && "hidden md:block", // Hide on mobile if closed, always block on desktop
        "md:flex md:items-center md:justify-between md:gap-4" // Desktop layout
      )}>
        
        {/* Desktop Ticker (Hidden on Mobile inside the list, because it's in the header) */}
        <div className="hidden md:flex flex-col items-end md:items-start min-w-[100px] order-2">
            <span className="text-2xl font-bold font-mono tracking-tight leading-none">
              ${(ticker?.lastPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <div className="flex gap-2 text-xs font-mono text-muted-foreground mt-1">
               <span className="text-green-500">B: {ticker?.bestBid?.toFixed(2)}</span>
               <span className="text-red-500">A: {ticker?.bestAsk?.toFixed(2)}</span>
            </div>
        </div>

        {/* Trading Pairs */}
        <div className="flex flex-col md:flex-row gap-2 md:gap-4 md:items-center order-1">
          <span className="text-xs text-muted-foreground uppercase font-bold md:hidden flex items-center gap-2 mb-1">
            <Coins size={12} /> Markets
          </span>
          <div className="grid grid-cols-3 md:flex gap-1">
            {TRADING_PAIRS.map((pair) => (
              <Button
                key={pair.symbol}
                variant={selectedPair === pair.symbol ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handlePairClick(pair.symbol)}
                className={cn(
                  'text-xs md:text-sm font-semibold',
                  selectedPair === pair.symbol && 'bg-primary text-primary-foreground'
                )}
              >
                {pair.name}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Divider for Mobile */}
        <div className="h-px bg-border my-3 md:hidden" />

        {/* Timeframes */}
        <div className="flex flex-col md:flex-row gap-2 md:gap-4 md:items-center order-3">
          <span className="text-xs text-muted-foreground uppercase font-bold md:hidden flex items-center gap-2 mb-1">
            <Clock size={12} /> Interval
          </span>
          <div className="grid grid-cols-6 md:flex gap-1">
            {TIMEFRAMES.map((tf) => (
              <Button
                key={tf.value}
                variant={selectedTimeframe === tf.value ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => handleTimeframeClick(tf.value)}
                className="text-[10px] md:text-xs h-8 px-0 md:px-3"
              >
                {tf.label}
              </Button>
            ))}
          </div>
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