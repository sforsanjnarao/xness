'use client'
import { useMarketFeed } from '@/hooks/useMarketFeed';
// import { useOrderBook } from '@/hooks/useOrderBook';

import { cn, normalizeSymbol } from '@/lib/utils';

export function OrderBook({ symbol, }: { symbol: string; currentPrice: number }) {
  const { bids, asks,ticker } = useMarketFeed(symbol);

  const maxTotal = Math.max(
    ...bids.map(b => b.total),
    ...asks.map(a => a.total),
    1
  );
  let firstSymbol=normalizeSymbol(symbol)

  return (

    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden text-xs">

      {/* Header */}
      <div className="grid grid-cols-3 px-3 py-2 text-muted-foreground border-b border-border">
        <div>Price (USDC)</div>
        <div className="text-right">Size ({firstSymbol})</div>
        <div className="text-right">Total ({firstSymbol})</div>
      </div>

      {/* Asks */}
      <div className="flex flex-col-reverse flex-1">
        {asks.map(row => (
          <Row key={row.price} row={row} type="ask" max={maxTotal} />
        ))}
      </div>

      {/* Middle price */}
      <div className="border-y border-border py-2 px-3  font-mono font-bold">
            <span
            className={cn(
                "font-mono font-bold transition-colors",
                ticker?.dir === "up" && "text-green-500",
                ticker?.dir === "down" && "text-red-500"
            )}
            >
            ${ticker?.lastPrice.toFixed(4)}
            </span>
        </div>

      {/* Bids */}
      <div className="flex-1">
        {bids.map(row => (
          <Row key={row.price} row={row} type="bid" max={maxTotal} />
        ))}
      </div>
    </div>
  );
}

function Row({ row, type, max }: any) {
  const w = (row.total / max) * 100;

  return (
    <div className="relative grid grid-cols-3 px-3 py-0.5 text-xs">
      <div
        className={cn(
          "absolute inset-y-0 right-0 opacity-20",
          type === 'ask' ? "bg-red-500" : "bg-green-500"
        )}
        style={{ width: `${w}%` }}
      />

      <div className={cn("z-10 font-mono", type === 'ask' ? "text-red-500" : "text-green-500")}>
        {row.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </div>
      <div className="z-10 text-right">{row.quantity.toFixed(4)}</div>
      <div className="z-10 text-right text-muted-foreground">{row.total.toFixed(2)}</div>
    </div>
  );
}