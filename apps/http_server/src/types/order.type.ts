enum orderSides{
    LONG= "long",
    SHORT="short"
}
enum orderStatus{
    OPEN = "open",
    CLOSED = "closed",
    LIQUIDATED = "liquidated"
}
enum Market{
    BTC_USDC="BTC_USDC",
    SOL_USDC="SOL_USDC",
    ETH_USDC="ETH_USDC"
}
export type futureMarketOrderTypes={
    id:string
    userId:string
    side:orderSides
    status:orderStatus
    market:Market
    quantity:number
    entryPrice: number
    closePrice: number
    takeProfitPrice?:number
    stopLossPrice?:number
    Margin:number
    leverage:number
    pnl:number
    createdAt: number
}