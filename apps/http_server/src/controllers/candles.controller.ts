import type { Request, Response } from "express"
import { GetCandlesQuerySchema, type GetCandlesQueryType } from "../zod/candles.zod"
export interface CandleResponse {
    bucket: number;
    symbol: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    time: number;
}

export interface UpstreamCandle {
    start: number;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
};


export type SymbolType = Record<string, string>

export const SYMBOL_MAP: SymbolType = {
    BTCUSDT: "BTC_USDC",
    BTCUSDC: "BTC_USDC",
    ETHUSDT: "ETH_USDC",
    ETHUSDC: "ETH_USDC",
    SOLUSDT: "SOL_USDC",
    SOLUSDC: "SOL_USDC",
}

//timeFrame(time Window) -> number of seconds
export type TimeWindowType = Record<string, number>

export const TIME_WINDOW_MAP: TimeWindowType = {
    "1m": 24 * 60 * 60,
    "3m": 2 * 24 * 60 * 60,
    "5m": 3 * 24 * 60 * 60,
    "15m": 7 * 24 * 60 * 60,
    "30m": 14 * 24 * 60 * 60,
    "1h": 30 * 24 * 60 * 60,
    "2h": 45 * 24 * 60 * 60,
    "4h": 60 * 24 * 60 * 60,
    "12h": 180 * 24 * 60 * 60,
    "1d": 365 * 24 * 60 * 60,
    "3d": 3 * 365 * 24 * 60 * 60,
    "1w": 2 * 365 * 24 * 60 * 60,
    "1M": 5 * 365 * 24 * 60 * 60,
}

//Default fallback time range: 7 days
export const DEFAULT_TIME_RANGE_SECONDS = 7*24*60*60

//-----
type CacheKey = `${string}:${string}`;

interface CacheEntry {
  data: CandleResponse[];
  fetchedAt: number;
}

const candleCache = new Map<CacheKey, CacheEntry>();
const TTL = 4000; // 4 seconds

export function getCachedCandles(symbol: string, tf: string) {
  const key: CacheKey = `${symbol}:${tf}`;
  const entry = candleCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > TTL) return null;
  return entry.data;
}

export function setCachedCandles(symbol: string, tf: string, data: CandleResponse[]) {
  const key: CacheKey = `${symbol}:${tf}`;
  candleCache.set(key, { data, fetchedAt: Date.now() });
}

//----
export async function getCandles(req: Request, res: Response): Promise<void> {
    const validatedResult = GetCandlesQuerySchema.safeParse(req.query)

    if (!validatedResult.success) {
        res.status(400).json({
            error: "Invalid query parameters",
            details: validatedResult.error.message
        })
        return
    }

    const query: GetCandlesQueryType = validatedResult.data

    const { timeFrame, asset } = query

    try {
        //Normalize asset name to uppercase
        const assetKey = asset.toUpperCase()

        if (!SYMBOL_MAP[assetKey]) {
            res.status(400).json({ error: `Unsupported asset: ${asset}`})
            return
        }
        const symbol = SYMBOL_MAP[assetKey]

        //Resolve time window
        const timeRangeInSeconds = TIME_WINDOW_MAP[timeFrame] ?? DEFAULT_TIME_RANGE_SECONDS

        const now = Math.floor(Date.now() / 1000);
        const startTime = now - timeRangeInSeconds;
        const endTime = now;

        //Construct Request URL
        const url = new URL("https://api.backpack.exchange/api/v1/klines")
        url.searchParams.set("symbol", symbol)
        url.searchParams.set("interval", timeFrame)
        url.searchParams.set("startTime", startTime.toString())
        url.searchParams.set("endTime", endTime.toString())

        const cached = getCachedCandles(assetKey, timeFrame);
            if (cached) {
            res.json({ data: cached });
            return;
            }
        const upstream = await fetch(url.toString())
        
        if (!upstream.ok) {
            const body = await upstream.text()

            console.error(
                `Backpack upstream failure: ${upstream.status} ${upstream.statusText}`,
                body
            )
            throw new Error(
            `Backpack api responded with status ${upstream.status}`
            )
        };

        const json = (await upstream.json()) as UpstreamCandle[];
        // console.log(json)
        const transformed: CandleResponse[] = json.map((candle: UpstreamCandle) => ({
            bucket: candle.start,
            symbol: assetKey,
            open: Number(candle.open),
            high: Number(candle.high),
            low: Number(candle.low),
            close: Number(candle.close),
            volume: Number(candle.volume),
            time: candle.start
        }))
        setCachedCandles(assetKey, timeFrame, transformed);

        // res.setHeader('Cache-Control', 'no-store');
        // res.setHeader('Pragma', 'no-cache');
        // res.setHeader('Expires', '0');
        res.json({ data: transformed })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error"

        console.error("Candles handler failure:", error)

        res.status(500).json({
            error: "failed to fetch candles from upstream API",
            details: message,
        })
    }
}