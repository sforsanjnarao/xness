//what basically engine 
//a engine is A DETERMINISTIC CALCULATION SERVICE
export type Side = "long" | "short"
export interface engineOrder {
    id: string;
    userId: string;
    asset: string;
    side: Side;
    qty: number;
    leverage: number;
    openingPrice: number;
    initialMargin: number;
    takeProfit?: number;
    stopLoss?: number;
    createdAt: number;
}

enum walletSymbol{
    SOL_USDC="SOL_USDC",
    ETH_USDC="ETH_USDC",
    BTC_USDC="BTC_USDC"
}
type balance={
    id: string
    userId: string
    symbol:walletSymbol
    balanceRaw:bigint       //bigInt Means floating
    balanceDecimal:number
    createdAt:Date
    updatedAt:Date
}
import { redisClient } from "@repo/redis-client";
const toInt = (val: number) => Math.round(val * 100_000_000); 
//read data from the stream (needs a loop in Block)
//process the data 
//put everything in the db
//response back to the backend
const price= new Map<string,{bid:number,ask:number}>()
const order= new Map() //all orders is gonna be here from the db
const balance=new Map<string,balance>()
type payloadType=Record<string,string>

const redis=redisClient()

let lastStreamId="$"

function calPnL(currentPrice:number,openPrice:number,side:Side,quantity:number){
    const pnl=side=='long'? (currentPrice-openPrice)*quantity : (openPrice-currentPrice)*quantity
    return pnl
}

function checkRisk(orders:engineOrder ,currentPrice:number){
    //cal pnl, margin, liquidation and closing the order
    let pnl=calPnL(currentPrice, orders.openingPrice, orders.side, orders.qty)
    let remainingMargin= orders.initialMargin + pnl //equity = credit
    let mainMargin=orders.initialMargin * toInt(0.05)
    
    let reason=null;
    if(remainingMargin<=mainMargin){
        reason='LIQUIDATION'
    }else if(orders.takeProfit && 
    ((orders.side=='long' && currentPrice>=orders.takeProfit)|| 
    (orders.side=='short' && currentPrice<=orders.takeProfit))){
            reason="TAKE_PROFIT"
    }else if(orders.stopLoss &&
        ((orders.side=='long' && currentPrice<=orders.stopLoss)|| 
        (orders.side=='short' && currentPrice>=orders.stopLoss))){
        reason="STOP_LOSS"
    }
    if(reason) executeClose(orders,reason,currentPrice,pnl,remainingMargin)


   
}
function executeClose(orders,reason,currentPrice,pnl,credit){
    //cal how many cridet u recive till now
    if(credit<0) credit=0;
    //get the balance 
    if(balance.get(orders.userId)){
        balance.set(orders.userId,)
    }
    //set the balance

    //delet the order from in-memory
    //push it to the db
    
    //sending close data to the queue
    sendCallbackToRedis()
}
function sendCallbackToRedis(){
    //crating an message for the queue 
    //adding that message in the queue with there expected kind
}
async function handlePriceUpdate(payload:payloadType){
    let {a,b,s}=payload
    let ask=Number(a)
    let bid=Number(b)
    let symbol=s as string

    price.set(symbol,{ask,bid})
    //going through all open orders
    for(let orders of order.values()){
        //filter through require symbol
        if(orders.s !==symbol) continue;
        // find the current price
        //if long ---> bid  || short ---> ask
        const currentPrice=orders.side=='long' ? bid : ask

        checkRisk(orders,currentPrice)  
    }

    
}
async function handleCreateOrder(payload:payloadType){

}

async function handleBalanceUpdate(payload:payloadType){

}
async function handleCloseOrder(payload:payloadType){

}


async function loadState(){
 console.log('loading the initial state')
}
async function engine(){
    await loadState()
    try{
        //start the loop
        while(true){
            //read the stream // one at a time inside a loop
            const response= await redis.xread(
                "BLOCK",
                0,
                "STREAMS",
                "trading-engine",
                lastStreamId
            )
            if(!response) continue

            //pase the response
            console.log(response)
            for(const [streamName,messages] of response){
                for (const [id, fields] of messages) {
                    lastStreamId=id;

                    try{
                        let rawData = ""
                        for (let i = 0; i < fields.length; i += 2) {
                            // httpServer uses "payload", pricePoller uses "data"
                            if (fields[i] === "data" || fields[i] === "payload") {
                                rawData = fields[i + 1] ?? ""
                            }
                        }
                        if (!rawData) continue
                        const msg=JSON.parse(rawData)
                        const kind=msg.kind || msg.type
                        const payload= msg.payload || msg.data

                        //routes the response by kind
                        switch(kind){
                            case "price-update": await handlePriceUpdate(payload); break
                            case "create-order": await handleCreateOrder(payload); break
                            case "close-order": await handleCloseOrder(payload); break
                            case "balance-update": await handleBalanceUpdate(payload); break
                            default: console.log("can't find this kind")
                        }
                    }catch(err){
                        console.error(`[SKIP] Malformed message ${id}:`, err);
                    }
                }
            }
        }
    }catch(err){
        console.error(err)
    }
}
engine()



