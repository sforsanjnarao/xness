//what basically engine 
//a engine is A DETERMINISTIC CALCULATION SERVICE
import {prisma} from "@repo/db"

export type Side = "long" | "short"
export interface engineOrder {
    id: string;
    userId: string;
    asset: string; //symbol
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
type balanceType={
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
//orderId,{engineOrder}
const orders= new Map<string,engineOrder>() //all orders is gonna be here from the db
const balance=new Map<string,Map<string,number>>()
type payloadType=Record<string,string>

let dbArray:any=[]

const redis=redisClient()

let lastStreamId="$"


const multiplyInt = (a: number, b: number) => {
    const bigA = BigInt(Math.round(a))
    const bigB = BigInt(Math.round(b))
    const scale = BigInt(100000000);

    return Number((bigA * bigB) / scale);
};
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
function getBalance(userId:string, symbol:string){
    if(!balance.has(userId)){
        balance.set(userId, new Map())
    }
    return balance.get(userId)?.get(symbol) || 0

}
function setBalance(amount:number, userId:string, symbol:string){
    //set the balance to the data structure
     if(!balance.has(userId)) balance.set(userId,new Map())
        balance.get(userId)?.set(symbol,amount)
    //push it to dbQueue to do to the db(slowly)
    queueDbAction({
        kind:'update_balance',
        payload:{
            balance:amount,
            userId,
            symbol
        }
    })
}

function queueDbAction(action:any){
    // check the length and put it into the array
    if(dbArray.length >=100){
        console.error(`[DB] Queue overflow! Size: ${dbArray.length}. Dropping oldest tasks.`)
        dbArray.shift()
    }
    //pushing it to the array
    dbArray.push()

}


//flushing the data to the db
function pushQueueToDb(){
    //take a snapshot of the dbArray min/max 100

    //u just need to put everything in right table
    //balance-updated in db

    //create-order in db

    //update-order in db

}




function executeClose(orders,reason,currentPrice,pnl,credit){
    //cal how many cridet u recive till now
    if(credit<0) credit=0;
    //get the balance 
    const getTheBalance=getBalance(orders.userId, orders.asset)

    //set the balance
    setBalance(getTheBalance,orders.userId, orders.asset)

    //delete the order from in-memory
    orders.delete(orders.id)
    //get the reason
    const closeReasonMap: Record<string, string> = {
        'TAKE_PROFIT': 'take_profit',
        'STOP_LOSS': 'stop_loss',
        'LIQUIDATION': 'liquidation',
        'manual': 'manual',
        'Manual': 'manual',
    };

    //push it to the db queue
    queueDbAction()
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
    for(let order of orders.values()){
        //filter through require symbol
        if(order.asset !==symbol) continue;
        // find the current price
        //if long ---> bid  || short ---> ask
        const currentPrice=order.side=='long' ? bid : ask

        checkRisk(order,currentPrice)  
    }

    
}
async function handleCreateOrder(payload:payloadType){

}

async function handleBalanceUpdate(payload:payloadType){

}
async function handleCloseOrder(payload:payloadType){

}


async function loadState(){
    //with this function we are putting all the data from 
    //DB to in-memory
 console.log('loading the initial state')
 //getting all the open order from the db
 const dbOrders=await prisma.order.findMany({
    where:{
        status:'OPEN'
    }
 })
 //Convert DB precision → engine precision
 for(let order of dbOrders){
    //->Db precision
    let dbPrice= Number(order.openPrice)/100
    let dbQuantity=Number(order.quantity)/100000000000

    //engine-> engine precision
    let openPrice=toInt(dbPrice)
    let qty=toInt(dbQuantity)

    //and putting in the memory
    orders.set(order.id, {
            id: order.id,
            userId: order.userId,
            asset: order.symbol, 
            side: order.side as Side,
            qty: qty,
            leverage: order.leverage,
            openingPrice: openPrice,
            initialMargin: multiplyInt(openPrice, qty) / order.leverage,
            takeProfit: order.takeProfitPrice ? toInt(Number(order.takeProfitPrice) / 100) : undefined,
            stopLoss: order.stopLossPrice ? toInt(Number(order.stopLossPrice) / 100) : undefined,
            createdAt: order.createdAt.getTime()
        });
    }
    console.log('loaded orders from db in-memory called orders')


 const dbBalance=await prisma.wallet.findMany()
 dbBalance.forEach((wallet)=>{
    //make a wallet for the user who don't exist
    if(!balance.has(wallet.userId)) balance.set(wallet.userId,new Map())
    //get the value engine can use
        const decimals = wallet.balanceDecimal ?? SYMBOL_DECIMALS[wallet.symbol as Symbol] ?? 8;
        const rawVal = wallet.balanceRaw ? Number(wallet.balanceRaw) : 0;
        const actualValue = rawVal / Math.pow(10, decimals);
        const engineScaledValue = toInt(actualValue);
    //put that value in the user's wallet with the symbol
        balance.get(wallet.userId)!.set(wallet.symbol,engineScaledValue)
 })
 console.log('store the value in the db')

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



