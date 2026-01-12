export interface engineOrder {
    id: string;
    userId: string;
    asset: assetType //symbol
    side: Side;
    qty: number;
    leverage: number;
    openingPrice: number;
    initialMargin: number;
    takeProfit?: number;
    stopLoss?: number;
    createdAt: number;
}

export type Side = "long" | "short"


export type CloseReason =
  | "TAKE_PROFIT"
  | "STOP_LOSS"
  | "LIQUIDATION"
  | "manual"
  | "Manual";


export interface precisionEngineOrder {
    id: string;
    userId: string;
    asset: string;
    side: "long" | "short";
    status: "OPEN" | "CLOSE"
    qty: bigint;            // Stored as 100000000 (1.00 BTC)
    leverage: number;       // Leverage is fine as a standard number (10x, 20x)
    openingPrice: bigint;   // Stored as 6000000000000 (60k)
    initialMargin: bigint;  // Calculated in BigInt
    takeProfit?: bigint;
    stopLoss?: bigint;
    createdAt: number;
}

enum assetType {
    USDC="USDC"
}
export type balanceType={
    depositId: string
    userId: string
    asset:assetType
    balanceRaw:bigint       //bigInt Means floating
    balanceDecimal:number
    createdAt:Date
    updatedAt:Date
}
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