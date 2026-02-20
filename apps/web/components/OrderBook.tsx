'use client'
import { useMarketFeed } from '@/hooks/useMarketFeed';
import { cn, normalizeSymbol } from '@/lib/utils';
import { JSX } from 'react';

export function OrderBook({ symbol }: { symbol: string }): JSX.Element {
  const { bids, asks, ticker } = useMarketFeed(symbol);
  const firstSymbol = normalizeSymbol(symbol);

  const displayAsks = [...asks].reverse();
  const displayBids = bids;

  const maxTotal = Math.max(
    ...asks.map(a => a.total),
    ...bids.map(b => b.total),
    1
  );

//  [
//   { price: 100, quantity: 2, total: 2 },
//   { price: 101, quantity: 3, total: 5 },
//   { price: 102, quantity: 4, total: 9 },
// ]

  return (
    <div className="flex flex-col h-full w-full bg-card border border-border rounded-lg overflow-hidden text-[10px] md:text-xs font-mono">

      {/* Header */}
      <div className="grid grid-cols-3 px-3 py-2 text-muted-foreground border-b border-border bg-secondary/20 font-sans">
        <div>Price</div>
        <div className="text-right">Size ({firstSymbol})</div>
        <div className="text-right">Total</div>
      </div>

      {/* ASKS */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {displayAsks.map(row => (
          <Row key={row.price} row={row} type="ask" max={maxTotal} />
        ))}
      </div>

      {/* Middle Price */}
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
      </div>

      {/* BIDS */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {displayBids.map(row => (
          <Row key={row.price} row={row} type="bid" max={maxTotal} />
        ))}
      </div>
    </div>
  );
}

function Row({ row, type, max }: any) {
  const w = Math.min((row.total / max) * 100, 100);

  return (
    <div className="relative grid grid-cols-3 px-3 py-0.5 h-[22px] items-center hover:bg-white/5 transition-colors">
      {/* Depth bar */}
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
      <div className="z-10 text-right">
        {row.quantity.toFixed(3)}
      </div>

      {/* Total */}
      <div className="z-10 text-right text-muted-foreground">
        {row.total.toFixed(2)}
      </div>
    </div>
  );
}