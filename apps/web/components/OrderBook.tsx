// 'use client'
// import { useMarketFeed } from '@/hooks/useMarketFeed';
// // import { useOrderBook } from '@/hooks/useOrderBook';

// import { cn, normalizeSymbol } from '@/lib/utils';
// import { JSX } from 'react';

// export function OrderBook({ symbol, }: { symbol: string; currentPrice: number }):JSX.Element {
//   const { bids, asks,ticker } = useMarketFeed(symbol);

//   const maxTotal = Math.max(
//     ...bids.map(b => b.total),
//     ...asks.map(a => a.total),
//     1
//   );
//   let firstSymbol=normalizeSymbol(symbol)

//   return (

//     <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden text-xs">

//       {/* Header */}
//       <div className="grid grid-cols-3 px-3 py-2 text-muted-foreground border-b border-border">
//         <div>Price (USDC)</div>
//         <div className="text-right">Size ({firstSymbol})</div>
//         <div className="text-right">Total ({firstSymbol})</div>
//       </div>

//       {/* Asks */}
//       <div className="flex flex-col-reverse flex-1">
//         {asks.map(row => (
//           <Row key={row.price} row={row} type="ask" max={maxTotal} />
//         ))}
//       </div>

//       {/* Middle price */}
//       <div className="border-y border-border py-2 px-3  font-mono font-bold">
//             <span
//             className={cn(
//                 "font-mono font-bold transition-colors",
//                 ticker?.dir === "up" && "text-green-500",
//                 ticker?.dir === "down" && "text-red-500"
//             )}
//             >
//             ${ticker?.lastPrice.toFixed(4)}
//             </span>
//         </div>

//       {/* Bids */}
//       <div className="flex-1">
//         {bids.map(row => (
//           <Row key={row.price} row={row} type="bid" max={maxTotal} />
//         ))}
//       </div>
//     </div>
//   );
// }

// function Row({ row, type, max }: any) {
//   const w = (row.total / max) * 100;  {/* the percentage*/}

//   return (
//     <div className="relative grid grid-cols-3 px-3 py-0.5 text-xs">
//       <div
//         className={cn(
//           "absolute inset-y-0 right-0 opacity-20",
//           type === 'ask' ? "bg-red-500" : "bg-green-500"
//         )}
//         style={{ width: `${w}%` }}
//       />
//       {/* the real price */}
//       <div className={cn("z-10 font-mono", type === 'ask' ? "text-red-500" : "text-green-500")}>
//         {row.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
//       </div>
//       {/* the quantity */}
//       <div className="z-10 text-right">{row.quantity.toFixed(2)}</div>
//         {/* the total */}
//       <div className="z-10 text-right text-muted-foreground">{row.total.toFixed(4)}</div>
//     </div>
//   );
// }












'use client'
import { useMarketFeed } from '@/hooks/useMarketFeed';
import { cn, normalizeSymbol } from '@/lib/utils';
import { JSX } from 'react';

export function OrderBook({ symbol }: { symbol: string; currentPrice: number }): JSX.Element {
  const { bids, asks, ticker } = useMarketFeed(symbol);
  const firstSymbol = normalizeSymbol(symbol);

  // Calculate max total for background bars
  const maxTotal = Math.max(
    ...bids.map(b => b.total),
    ...asks.map(a => a.total),
    1
  );

  return (
    <div className="flex flex-col h-full w-full bg-card border border-border rounded-lg overflow-hidden text-[10px] md:text-xs font-mono">
      
      {/* Header */}
      <div className="grid grid-cols-3 px-3 py-2 text-muted-foreground border-b border-border bg-secondary/20 font-sans">
        <div>Price</div>
        <div className="text-right">Size ({firstSymbol})</div>
        <div className="text-right">Total</div>
      </div>

      {/* 
         ASKS SECTION (Red) 
         We use flex-col-reverse so the first item (Best Ask/Lowest Price) 
         sits at the BOTTOM, closest to the middle bar.
         Overflow hides the top items (Highest Prices).
      */}
      <div className="flex flex-col-reverse flex-1 overflow-hidden">
        {asks.slice(0, 15).map((row) => (
          <Row key={row.price} row={row} type="ask" max={maxTotal} />
        ))}
      </div>

      {/* Middle Price Bar */}
      <div className="border-y border-border py-2 px-3 bg-card z-10 flex items-center justify-center md:justify-start gap-2 shadow-sm">
        <span
          className={cn(
            "text-sm md:text-base font-bold transition-colors",
            ticker?.dir === "up" && "text-green-500",
            ticker?.dir === "down" && "text-red-500",
            !ticker?.dir && "text-foreground"
          )}
        >
          ${ticker?.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
        {/* {ticker?.markPrice && (
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
                 Mark: {ticker.markPrice.toFixed(2)}
            </span>
        )} */}
      </div>

      {/* 
         BIDS SECTION (Green)
         Standard flex-col. First item (Best Bid/Highest Price) 
         sits at the TOP, closest to the middle bar.
         Overflow hides the bottom items (Lowest Prices).
      */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {bids.slice(0, 15).map((row) => (
          <Row key={row.price} row={row} type="bid" max={maxTotal} />
        ))}
      </div>
    </div>
  );
}

function Row({ row, type, max }: any) {
  // Cap width at 100%
  const w = Math.min((row.total / max) * 100, 100);

  return (
    <div className="relative grid grid-cols-3 px-3 py-0.5 hover:bg-white/5 cursor-pointer transition-colors h-[22px] items-center">
      {/* Background Depth Bar */}
      <div
        className={cn(
          "absolute inset-y-0 right-0 opacity-15 transition-all duration-300",
          type === 'ask' ? "bg-red-500" : "bg-emerald-500"
        )}
        style={{ width: `${w}%` }}
      />
      
      {/* Price */}
      <div className={cn("z-10 font-bold", type === 'ask' ? "text-red-500" : "text-emerald-500")}>
        {row.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </div>
      
      {/* Size */}
      <div className="z-10 text-right text-foreground/90">
        {row.quantity.toFixed(3)}
      </div>
      
      {/* Total */}
      <div className="z-10 text-right text-muted-foreground">
        {row.total.toFixed(2)}
      </div>
    </div>
  );
}