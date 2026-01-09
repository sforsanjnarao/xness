//what basically engine 
//a engine is A DETERMINISTIC CALCULATION SERVICE
import {prisma} from "@repo/db"
import {Symbol, SYMBOL_DECIMALS} from "@repo/types"


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

enum walletSymbol{
    SOL_USDC="SOL_USDC",
    ETH_USDC="ETH_USDC",
    BTC_USDC="BTC_USDC"
}
type balanceType={
    depositId: string
    userId: string
    symbol:Symbol
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

export type CloseReason =
  | "TAKE_PROFIT"
  | "STOP_LOSS"
  | "LIQUIDATION"
  | "manual"
  | "Manual";

let isFlushingDB = false;
import { redisClient } from "@repo/redis-client";
//read data from the stream (needs a loop in Block)
//process the data 
//put everything in the db
//response back to the backend
let price= new Map<string,{bid:bigint,ask:bigint}>()

// function getPrice(symbol: string) {
//     if (!price.has(symbol)) {
//         price.set(symbol, { bid: 10n, ask: 10n });
//     }
//     return price.get(symbol)!;
// }
// getPrice("BTC");
//orderId,{engineOrder}
let orders= new Map<string,precisionEngineOrder>() //all orders is gonna be here from the db
let balance = new Map<string, Map<string, bigint>>(); //userId->symbol,money

type payloadType=Record<any,any>

let dbArray:any=[]

const redis=redisClient()

let lastStreamId="$"

//conversion part
// 10.1*100000000
let scale=Math.pow(10,8)
let toEnginePrecision=(num:number):bigint=>{
    return BigInt(Math.round(num*scale))
}

let fromEnginePrecision = (val: bigint | number): number => {
    let num = Number(val);
    return num / scale;
};


let multiplyInt = (a: bigint, b: bigint)=> {
    return (a * b) / BigInt(scale);
};
//pnl=(current - open)*qty
function calPnL(currentPrice:bigint,openPrice:bigint,side:Side,quantity:bigint){
    // let pnl=side=='long'? (currentPrice-openPrice)*quantity : (openPrice-currentPrice)*quantity
    // return pnl
    const diff = side === "long" ? currentPrice - openPrice : openPrice - currentPrice;
    return (diff * quantity) / BigInt(ENGINE_CONSTANTS.PRECISION_SCALE);
}
let marginThreshold=0.05
function checkRisk(order:precisionEngineOrder ,currentPrice:bigint){
    //cal pnl, margin, liquidation and closing the order
    let pnl=calPnL(currentPrice, order.openingPrice, order.side, order.qty)
    let remainingMargin= order.initialMargin + pnl //equity = credit
    let mainMargin=order.initialMargin * toEnginePrecision(marginThreshold)
    
    let reason=null;
    if(remainingMargin<=mainMargin){
        reason='LIQUIDATION'
    }else if(order.takeProfit && 
    ((order.side=='long' && currentPrice>=order.takeProfit)|| 
    (order.side=='short' && currentPrice<=order.takeProfit))){
            reason="TAKE_PROFIT"
    }else if(order.stopLoss &&
        ((order.side=='long' && currentPrice<=order.stopLoss)|| 
        (order.side=='short' && currentPrice>=order.stopLoss))){
        reason="STOP_LOSS"
    }
    if(reason) executeClose(order,reason,currentPrice,pnl)


   
}
async function getBalance(userId:string, symbol:string):Promise<bigint>{
    console.log(userId,symbol)
    if(!balance.has(userId)){
        balance.set(userId, new Map())
    }
    console.log('from balanceMap',balance.get(userId))
    return balance.get(userId)?.get(symbol) ?? 0n

}
function queueDbAction(action:any){
    // check the length and put it into the array
    if(dbArray.length >=100){
        console.error(`[DB] Queue overflow! Size: ${dbArray.length}. Dropping oldest tasks.`)
        dbArray.shift()
    }
    //pushing it to the array
    dbArray.push(action)
    

}


// flushing the data to the db
async function pushQueueJobsToDb() {
    if (isFlushingDB || dbArray.length === 0) return;
    console.log('lalala')
    isFlushingDB = true;

    //Take a snapshot of the current queue
    const batch = dbArray.splice(0, ENGINE_CONSTANTS.DB_BATCH_SIZE); //(0,100)

    try {
        for (let task of batch) {
            try {
                if (task.type === "balance-updated") {
                    let { userId, symbol, balance } = task.payload;

                    // Get the correct decimals for this symbol
                    let decimals = SYMBOL_DECIMALS[symbol as Symbol] ?? 8;

                    // Convert from engine precision (100_000_000) to actual value
                    // let actualValue = fromEnginePrecision(balance);

                    // // Convert to database format using symbol-specific decimals
                    // let balanceRaw = BigInt(Math.round(actualValue * Math.pow(10, decimals)));
                    let balanceRaw =
                        balance * BigInt(Math.pow(10, decimals)) / BigInt(ENGINE_CONSTANTS.PRECISION_SCALE);

                    await prisma.wallet.upsert({
                        where: { userId_symbol: { userId, symbol } },
                        create: { userId, symbol, balanceRaw, balanceDecimal: decimals },
                        update: { balanceRaw }
                    });
                } else if (task.type === "create_order") {
                    console.log('is these rain')
                    console.log(task)
                    await prisma.order.create({
                        data: task.payload
                    })
                } else if (task.type === "order_close") {
                    console.log('order-close_task:',task)
                    try {
                        await prisma.order.update({
                            where: { id: task.payload.id },
                            data: task.payload.update
                        })
                    } catch (error: any) {
                        console.error(`[DB] Close Error ${task.payload.id}`, error.message);
                    }
                }
            } catch (error) {
                console.error(`[DB] failed to process ${task.type}:`, error);
            }
        }
    } catch (error) {
        console.error("[DB] Critical Batch Error:", error);
    } finally {
        isFlushingDB = false;
    }
}


// Add these imports to access Prisma Enums



setInterval(() => {
    pushQueueJobsToDb();
}, ENGINE_CONSTANTS.DB_FLUSH_INTERVAL_MS);



async function executeClose(order:precisionEngineOrder,
    reason:string,
    currentPrice:bigint,
    pnl:bigint
){
    //make credit by ur self
    let credit=order.initialMargin + pnl
    if(credit<0) credit=BigInt(0);
    //get the balance 
    let getTheBalance=await getBalance(order.userId, order.asset)
    // let payload={
    //     userId:order.userId,
    //     symbol:order.asset
    // }
    //set the balance
    // setBalance(getTheBalance,payload)
    mutateBalance(order.userId, order.asset, getTheBalance + credit);

    //delete the order from in-memory
    orders.delete(order.id)
    //get the reason
    let closeReasonMap: Record<string, string> = {
        'TAKE_PROFIT': 'take_profit',
        'STOP_LOSS': 'stop_loss',
        'LIQUIDATION': 'liquidation',
        'manual': 'manual',
        'Manual': 'manual'
    };
    let dbCloseReason=closeReasonMap[reason] || 0
    
//mirroring the prisma
    // prisma.order.update({
    //     where: { id },
    //     data: update
    // })
    //push it to the db queue
   queueDbAction({
    type:'order_close',
    payload:{
        id:order.id,
        update:{
            status:"CLOSED",
            //convert then into db one
            closePrice: Math.round(fromEnginePrecision(currentPrice) * ORDER_PRECISION.PRICE),
            // Pnl: Math.round(fromEnginePrecision(pnl) * ORDER_PRECISION.PRICE),
            Pnl: Number(
                pnl * BigInt(ORDER_PRECISION.PRICE) / BigInt(ENGINE_CONSTANTS.PRECISION_SCALE)
                ),
            closedAt: new Date(),
            reason:dbCloseReason
        }
    }
   })

   console.log(`Order ${order.id} close with this ${pnl}`)
    //sending close data to the queue
    sendCallbackToRedis(order.id, "closed",{pnl:fromEnginePrecision(pnl),currentPrice:fromEnginePrecision(currentPrice), reason})
}

//if the order got produced or not
// and put it in the redis callback
async function sendCallbackToRedis(id:string,status:string ,payload:any){
   try{
     //crating an message for the queue 
        await redis.xadd(
            "callback_queue",
            "*",
            "id",id,
            "status",status,
            "payload", JSON.stringify(payload)
        )
        //adding that message in the queue with there expected kind
    }catch(err){
        console.error(err)
   }
}
async function handlePriceUpdate(payload:payloadType){
    let {a,b,s}=payload
    let ask=toEnginePrecision(a) //bigint
    let bid=toEnginePrecision(b) //bigint
    let splitSymbol=s.split('_')
    let symbol=splitSymbol[0]

    price.set(symbol,{ask,bid})
    
    
    // console.log('A:',a,"B:",b,"symbol:",symbol)
    //going through all open orders
    for(let order of orders.values()){
        //filter through require symbol
        if(order.asset !==symbol) continue;
        // find the current price
        //if long ---> bid  || short ---> ask
        let currentPrice=order.side=='long' ? bid : ask

        checkRisk(order,currentPrice)  
    }
}

function calcMargin(
  price: bigint,   // ENGINE scale
  qty: bigint,     // ENGINE scale
  leverage: bigint
): bigint {

  // (price * qty) gives ENGINE²
  const notionalEngine =
      (price * qty) / 1_000_000_000n;

  // Convert ENGINE → BTC atomic
  const notionalBTC =
      (notionalEngine * 100_000_000n) / 1_000_000_000n;

  return notionalBTC / leverage;
}

async function handleCreateOrder(payload:payloadType){
    console.log("got_the_payload_to_create_order_handler:",payload)
    //get the payload
    let {id, userId, symbol, side, qty, leverage, takeProfit, stopLoss}=payload
    if(!symbol){
        console.log('need symbol:',symbol)
    }

    //validate everything
    let normalizedAsset = symbol.toUpperCase();
    console.log('normalizedAsset:',normalizedAsset)


    if (orders.has(id)) return;  //u can crete the order which already exist

    let priceData = price.get(normalizedAsset);
    console.log('priceData',priceData)

    if (!priceData) {
        return sendCallbackToRedis(id, "no_price", { reason: "Price data not available for asset" });
    }


    let openingPrice = side === "long" ? priceData.ask : priceData.bid;
    console.log("openPrice:",openingPrice)
    let qtyInt = toEnginePrecision(Number(qty));
    let lev = BigInt(leverage);
    console.log('LEVERAGE:',lev)
    //some margin stuff
    // let totalValue = multiplyInt(openingPrice, qtyInt);
    // let marginRequired = totalValue / lev
    const marginRequired = calcMargin(openingPrice, qtyInt, lev);
    console.log("marginRequired:",marginRequired)
    console.log('done_calculation')

    let userBal = await getBalance(userId, symbol); //bigint
    
    console.log('user_balance:',userBal)
    if (userBal < marginRequired) {
        console.log('1. is here')
        return sendCallbackToRedis(id, "insufficient_balance", { reason: "Not enough balance for margin requirement" })
    }
    //  let create_order_balance_payload={
    //     userId:userId,
    //     symbol:symbol
    // }

    //update balance
    // setBalance(userBal - marginRequired,create_order_balance_payload)

    // let margin=(userBal - marginRequired)/ BigInt(scale)
    // console.log('margin:',margin)

    console.log('userBal - marginRequired:',userBal - marginRequired)
    mutateBalance(userId, symbol, userBal - marginRequired);
    console.log('lalala')
    //need to make the order
    let order: precisionEngineOrder = {
            id, userId, asset: normalizedAsset, side,
            qty: qtyInt,
            leverage: Number(lev),
            openingPrice,
            status: "OPEN",
            initialMargin: marginRequired,
            takeProfit: takeProfit ? toEnginePrecision(Number(takeProfit)) : undefined,
            stopLoss: stopLoss ? toEnginePrecision(Number(stopLoss)) : undefined,
            createdAt: Date.now()
        }
    //set new order in-memory  
    orders.set(id,order)
    console.log('ORDER_MAP:',orders)
    //send it to dbArray
    queueDbAction({
        type:"create_order",
        payload:{
            id,
            userId,
            symbol: normalizedAsset,
            side,
            quantity: Math.round(Number(qty) * ORDER_PRECISION.QUANTITY),
            quantityDecimal: 5,
            leverage: Number(lev),
            openPrice: Math.round(fromEnginePrecision(openingPrice) * ORDER_PRECISION.PRICE),
            priceDecimals: 2,
            margin: Math.round(fromEnginePrecision(marginRequired) * ORDER_PRECISION.PRICE),
            status: "OPEN",
            createdAt: new Date()
        }
    })
    console.log('pushed to db')

    //notify the user
    sendCallbackToRedis(id,'open',{price: fromEnginePrecision(openingPrice)})
}

async function handleCloseOrder(payload:payloadType){
    console.log('close_payload:',payload)
    //get the payload
    let {userId, orderId}=payload
    if(!orderId){
        return sendCallbackToRedis(orderId, "order_not_found",{reason:"order if not found"})
    }
    //get that specific order from in memory
    let order= orders.get(orderId)
    if(!order){
        return sendCallbackToRedis(orderId, "order_not_found",{reason:"order not found"})
    }

    //get the symbol with the help of orderId
    let priceData=price.get(order.asset)
    let closePrice = priceData ? (order.side === "long" ? priceData.bid : priceData.ask) : order.openingPrice;
    let pnl = calPnL(closePrice, order.openingPrice, order.side, order.qty);

   executeClose(order, "manual", closePrice,  pnl);

}

function mutateBalance(userId: string, symbol: string, amount: bigint) {
    console.log('storing balance:',amount)
    if (!balance.has(userId)) balance.set(userId, new Map());
    balance.get(userId)!.set(symbol, amount);
    const decimal=SYMBOL_DECIMALS[symbol as Symbol]
    //TODO: wrong structure
    queueDbAction({
        type: 'balance-update',
        payload: { userId, symbol, balanceRaw: amount ,balanceDecimal:decimal,updatedAt: Date.now()}
    });
}

async function handleBalanceUpdate(payload: balanceType) {
    const { depositId, userId, symbol, balanceRaw, balanceDecimal } = payload;

    mutateBalance(userId, symbol, balanceRaw);

    sendCallbackToRedis(depositId, 'balance_updated', {
        id: depositId,
        userId,
        symbol,
        balanceRaw,
        balanceDecimal
    });
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
 console.log('dbOrders:',dbOrders)
 //Convert DB precision → engine precision
 for(let order of dbOrders){
    //->Db precision
    let dbPrice= Number(order.openPrice)/100
    let dbQuantity=Number(order.quantity)/100000000000

    //engine-> engine precision
    let openPrice=toEnginePrecision(dbPrice)
    let qty=toEnginePrecision(dbQuantity)
    console.log("the leverage",order.leverage)
   
    const leverage = order.leverage > 0 ? BigInt(order.leverage) : 1n;
    let initialMargin=multiplyInt(openPrice, qty) /leverage
    console.log('the initialMargin:',initialMargin)
    //and putting in the memory
    orders.set(order.id, {
            id: order.id,
            userId: order.userId,
            asset: order.symbol, 
            side: order.side as Side,
            qty: qty,
            status: order.status== "OPEN" ? "OPEN" : 'CLOSE',
            leverage: order.leverage,
            openingPrice: openPrice,
            initialMargin: initialMargin,
            takeProfit: order.takeProfitPrice ? toEnginePrecision(Number(order.takeProfitPrice) / 100) : undefined,
            stopLoss: order.stopLossPrice ? toEnginePrecision(Number(order.stopLossPrice) / 100) : undefined,
            createdAt: order.createdAt.getTime()
        });
    }
    console.log('loaded orders from db in-memory called orders')


 const dbBalance=await prisma.wallet.findMany()
 console.log('dbBalance:',dbBalance)
 dbBalance.forEach((wallet)=>{
    //make a wallet for the user who don't exist
    if(!balance.has(wallet.userId)) balance.set(wallet.userId,new Map())
    //get the value engine can use
        const decimals = wallet.balanceDecimal ?? SYMBOL_DECIMALS[wallet.symbol as Symbol] ?? 8;
        const rawVal = wallet.balanceRaw ?? 0;
        const engineValue =
            BigInt(rawVal) * BigInt(ENGINE_CONSTANTS.PRECISION_SCALE) /
            BigInt(Math.pow(10, decimals));
        // const actualValue = rawVal / Math.pow(10, decimals);
        // const engineScaledValue = actualValue;
    //put that value in the user's wallet with the symbol
        balance.get(wallet.userId)!.set(wallet.symbol,engineValue)
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
            // console.log('RESPONSE_to_engine:',response)
            //pase the response
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
                        // console.log("PARSED_MESSAGE:",msg)
                        const kind=msg.kind || msg.type
                        const payload= msg.payload || msg.data

                        //routes the response by kind
                        switch(kind){
                            //market price update
                            case "price-update": await handlePriceUpdate(payload); break
                            case "create-order": await handleCreateOrder(payload); break
                            case "close-order": await handleCloseOrder(payload); break
                            //wallet updates
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





