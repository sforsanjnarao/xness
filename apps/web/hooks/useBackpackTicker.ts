import { useEffect, useState, useRef } from 'react';

const WS_URL = "wss://ws.backpack.exchange";

export interface Ticker {
  symbol: string;
  bestBid: number;
  bestAsk: number;
  lastPrice: number;
}

export const useBackpackTicker = (activeSymbol: string) => {
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Convert "BTCUSDC" -> "BTC_USDC" for Backpack API
  const formattedSymbol = activeSymbol.includes('_') 
    ? activeSymbol 
    : `${activeSymbol.replace('USDC', '')}_USDC`;

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      // Subscribe to bookTicker for the active symbol
      const payload = {
        method: "SUBSCRIBE",
        params: [`bookTicker.${formattedSymbol}`],
        id: Date.now()
      };
      ws.send(JSON.stringify(payload));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        // Handle "bookTicker" update
        // data: { a: "askPrice", b: "bidPrice", s: "BTC_USDC" ... }
        if (msg.data && msg.stream?.startsWith('bookTicker')) {
          const { a, b, s } = msg.data;
          setTicker({
            symbol: s,
            bestAsk: parseFloat(a),
            bestBid: parseFloat(b),
            // For perp UI, usually mark price or mid price is used. 
            // We'll use Mid Price for display if no trade data
            lastPrice: (parseFloat(a) + parseFloat(b)) / 2 
          });
        }
      } catch (e) {
        console.error("WS Parse Error", e);
      }
    };

    // Heartbeat to keep connection alive
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ method: "PING" })); // Some WS need ping
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [formattedSymbol]);

  return ticker;
};