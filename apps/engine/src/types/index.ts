
export interface engineOrder {
    id: string;
    userId: string;
    asset: assetType 
    side: Side;
    qty: number;
    leverage: number;
    openingPrice: number;
    initialMargin: number;
    takeProfit?: number;
    stopLoss?: number;
    createdAt: number;
}

export type Side = "LONG" | "SHORT"


export type CloseReason =
  | "TAKE_PROFIT"
  | "STOP_LOSS"
  | "LIQUIDATION"
  | "manual"
  | "Manual";

export enum Asset{
    USDT='USDC'
}
export interface precisionEngineOrder {
    id: string;
    userId: string;
    asset: string;
    side: "LONG" | "SHORT";
    status: "OPEN" | "CLOSE"
    qty: bigint;            
    leverage: number;       
    openingPrice: bigint;  
    initialMargin: bigint;  
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
    balanceRaw:bigint       
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