"use client";
import { useEffect, useRef, useState } from "react";

const WS_URL = "wss://ws.backpack.exchange";

export interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number;
}

export interface Ticker {
  symbol: string;
  bestBid: number;
  bestAsk: number;
  lastPrice: number;
  dir: "up" | "down" | null;
}
export interface MarketFeed {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  ticker: Ticker | null;
}
export const useMarketFeed = (symbol: string): MarketFeed => {
  const bidsRef = useRef<Map<number, number>>(new Map()); //map<price,quantity>
  const asksRef = useRef<Map<number, number>>(new Map()); //map<price,quantity>
  const lastPriceRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);
  const [ticker, setTicker] = useState<Ticker | null>(null);

  const formatted = symbol.includes("_")
    ? symbol
    : symbol.replace("USDC", "_USDC");

  // update raw depth
  const updateSide = (book: Map<number, number>, updates: [string, string][]) => {
    for (const [p, q] of updates) {
      const price = Number(p);
      const qty = Number(q);
      if (qty === 0) book.delete(price);
      else book.set(price, qty);
    }
  };

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        method: "SUBSCRIBE",
        params: [
          `depth.${formatted}`,
          `bookTicker.${formatted}`,
        ],
        id: Date.now(),
      }));
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (!msg?.data) return;
      if (msg.data.s !== formatted) return;

      if (msg.stream?.startsWith("depth")) {
        if (msg.data.b) updateSide(bidsRef.current, msg.data.b);
        if (msg.data.a) updateSide(asksRef.current, msg.data.a);
      }

      if (msg.stream?.startsWith("bookTicker")) {
        const bid = Number(msg.data.b);
        const ask = Number(msg.data.a);
        const price = (bid + ask) / 2;

        const prev = lastPriceRef.current;
        const dir = prev == null ? null : price > prev ? "up" : "down";
        lastPriceRef.current = price;

        setTicker({
          symbol: msg.data.s,
          bestBid: bid,
          bestAsk: ask,
          lastPrice: price,
          dir,
        });
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          method: "UNSUBSCRIBE",
          params: [
            `depth.${formatted}`,
            `bookTicker.${formatted}`,
          ],
          id: Date.now(),
        }));
      }
      ws.close();
      bidsRef.current.clear();
      asksRef.current.clear();
      lastPriceRef.current = null;
    };
  }, [formatted]);

  // snapshot render for depth
  useEffect(() => {
    const id = setInterval(() => {
      const build = (book: Map<number, number>, side: "bid" | "ask") => {
        const sorted = [...book.entries()]
          .sort((a, b) =>
            side === "bid" ? b[0] - a[0] : a[0] - b[0]
          )
          .slice(0, 13);

        let sum = 0;
        return sorted.map(([price, quantity]) => {
          sum += quantity;
          return { price, quantity, total: sum };
        });
      };

      setBids(build(bidsRef.current, "bid"));
      setAsks(build(asksRef.current, "ask"));
    }, 100);

    return () => clearInterval(id);
  }, []);

  return { bids, asks, ticker };
};