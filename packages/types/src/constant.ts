//conversion constant
export const ENGINE_CONSTANTS = {
    PRECISION_SCALE: 100_000_000,
    DB_BATCH_SIZE: 100,
    DB_FLUSH_INTERVAL_MS: 1000,
    MARGIN_THRESHOLD: 0.05,
    MAX_QUEUE_SIZE: 10000,
} as const


export const ORDER_PRECISION = {
    PRICE: 100,
    QUANTITY: 100000000000
} as const;

export const SYMBOL_DECIMALS = {
    BTC: 8,   // Bitcoin: 1 BTC = 100,000,000 satoshis
    ETH: 18,  // Ethereum: 1 ETH = 1,000,000,000,000,000,000 wei
    SOL: 9,   // Solana: 1 SOL = 1,000,000,000 lamports
    USDC: 6,  // USDC: 1 USDC = 1,000,000 micro-units
} as const;

export type Symbol = keyof typeof SYMBOL_DECIMALS;

//redis constant

export const REDIS_ENGINE_CONSTANTS = {
    CALLBACK_QUEUE: "callback_queue",
    REQUEST_STREAM_KEY: "trading-engine",
    RETRY_DELAY_MS: 5000,
    POLLING_TIMEOUT: 0
} as const
