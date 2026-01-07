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

export interface precisionEngineOrder {
    id: string;
    userId: string;
    asset: string;
    side: "long" | "short";
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
    id: string
    userId: string
    symbol:walletSymbol
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
export const SYMBOL_DECIMALS = {
    BTC: 8,   // Bitcoin: 1 BTC = 100,000,000 satoshis 
    ETH: 18,  // Ethereum: 1 ETH = 1,000,000,000,000,000,000 wei
    SOL: 9,   // Solana: 1 SOL = 1,000,000,000 lamports
    USDC: 6,  // USDC: 1 USDC = 1,000,000 micro-units
} as const;

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


import { redisClient } from "@repo/redis-client";
//read data from the stream (needs a loop in Block)
//process the data 
//put everything in the db
//response back to the backend
const price= new Map<string,{bid:bigint,ask:bigint}>()
//orderId,{engineOrder}
const orders= new Map<string,precisionEngineOrder>() //all orders is gonna be here from the db
const balance = new Map<string, Map<string, bigint>>(); //userId->symbol,money

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
    const num = Number(val);
    return num / scale;
};


const multiplyInt = (a: bigint, b: bigint) => {
    return (a * b) / BigInt(scale);
};
function calPnL(currentPrice:bigint,openPrice:bigint,side:Side,quantity:bigint){
    const pnl=side=='long'? (currentPrice-openPrice)*quantity : (openPrice-currentPrice)*quantity
    return pnl
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
        type:'update_balance',
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
    dbArray.push(action)

}


//flushing the data to the db
function pushQueueJobsToDb(){
    //take a snapshot of the dbArray min/max 100
    const snapData=dbArray.splice(0,ENGINE_CONSTANTS.DB_BATCH_SIZE)
    //u just need to put everything in right table
    //balance-updated in db
   
    //create-order in db
            //close-order
    //update-order in db

}




function executeClose(order:precisionEngineOrder,
    reason:string,
    currentPrice:bigint,
    pnl:bigint
){
    //make credit by ur self
    let credit=order.initialMargin + pnl
    if(credit<0) credit=BigInt(0);
    //get the balance 
    const getTheBalance=getBalance(order.userId, order.asset)

    //set the balance
    setBalance(getTheBalance,order.userId, order.asset)

    //delete the order from in-memory
    orders.delete(order.id)
    //get the reason
    const closeReasonMap: Record<string, string> = {
        'TAKE_PROFIT': 'take_profit',
        'STOP_LOSS': 'stop_loss',
        'LIQUIDATION': 'liquidation',
        'manual': 'manual',
        'Manual': 'manual'
    };
    const dbCloseReason=closeReasonMap[reason] || 0
    
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
            status:"closed",
            //convert then into db one
            closePrice: Math.round(fromEnginePrecision(currentPrice) * ORDER_PRECISION.PRICE),
            pnl: Math.round(fromEnginePrecision(pnl) * ORDER_PRECISION.PRICE),
            closedAt: Date.now(),
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
async function sendCallbackToRedis(orderId:string,status:string ,payload:any){
   try{
     //crating an message for the queue 
        await redis.xadd(
            "callback_queue",
            "*",
            "id",orderId,
            "status",status,
            "payload", payload
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
    let symbol=s as string

    price.set(symbol,{ask,bid})
    
    
    // console.log('A:',a,"B:",b,"symbol:",symbol)
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
// async function createOrder(payload:payloadType) {
//     const {id,userId,side,symbol,qty,leverage,takeProfit,stopLoss}=payload

//     const priceData=price.get(symbol)
//     if(!priceData){
//         return sendCallbackToRedis(id,'closed', {reason:"pice_don't exist"})
//     }
    
//     const openingPrice=side==='long'? priceData.ask : priceData.bid

//     //initialMargin=(priceOfAnAsset*qty)/leverage
//     const initialMargin=openingPrice*qty/leverage //conterv to int
//     //floating point no. math not good

//     //lock the money with initialMargin
//     const bal=balance.get(userId)?.get('USDC')
//     //also write if u didn't get the make a trip to db
//     if(!bal) return sendCallbackToRedis(id,'failed_to_create',{reason:"didn't get the balance"})
//     if(bal<initialMargin){
//         return sendCallbackToRedis(id,"balance_inefficient",{reason:'balance_inefficient'})
//     }
//     //update balance code here-> bal-IM
//     balance.get(userId)?.set("USDC",bal-initialMargin)

//     if(orders.has(id)){
//         return //sendCallback
//     }
//     //store order in ram
//     orders.set(id,
//         {
//             id:id,
//             userId,
//             asset:symbol,
//             side:side,
//             openingPrice:openingPrice,
//             initialMargin:initialMargin,
//             createdAt:Date.now(),
//             qty,
//             leverage,
//             takeProfit, //convert to int
//             stopLoss    //int
            
//         }
//     )


//     //now put the open order in dbArray

//     //and give the message to user for the order created
//     sendCallbackToRedis(id,'order_created',{reason:"order created successfully"})
    
// }
async function handleCreateOrder(payload:payloadType){
    //get the payload
    const {id, userId, symbol, side, qty, leverage, takeProfit, stopLoss}=payload
    //validate everything
    const normalizedAsset = symbol.toUpperCase();


    if (orders.has(id)) return;  //u can crete the order which already exist

    const priceData = price.get(normalizedAsset);

    if (!priceData) {
        return sendCallbackToRedis(id, "no_price", { reason: "Price data not available for asset" });
    }


    const openingPrice = side === "long" ? priceData.ask : priceData.bid;
    console.log("openPrice:",openingPrice)
    const qtyInt = toEnginePrecision(Number(qty));
    const lev:bigint = BigInt(leverage);
    //some margin stuff
    const totalValue = multiplyInt(openingPrice, qtyInt);
    const marginRequired = totalValue / lev

    const userBal = getBalance(userId, "USDC");
    if (userBal < marginRequired) {
        return sendCallbackToRedis(id, "insufficient_balance", { reason: "Not enough balance for margin requirement" })
    }


    //update balance
    setBalance(userBal - marginRequired,userId ,symbol)

    //need to make the order
    const order: precisionEngineOrder = {
            id, userId, asset: normalizedAsset, side,
            qty: qtyInt,
            leverage: Number(lev),
            openingPrice,
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
            quantityDecimals: 5,
            leverage: lev,
            openPrice: Math.round(fromEnginePrecision(openingPrice) * ORDER_PRECISION.PRICE),
            priceDecimals: 2,
            margin: Math.round(fromEnginePrecision(marginRequired) * ORDER_PRECISION.PRICE),
            status: "open",
            createdAt: new Date()
        }
    })
    console.log('pushed to db')

    //notify the user
    sendCallbackToRedis(id,'created',{price: fromEnginePrecision(openingPrice)})
}

// async function handleCloseOrder(payload:payloadType){
//     //get the payload
//     const {userId, orderId}=payload
//     if(!orderId){
//         return sendCallbackToRedis(orderId, "order_not_found",{reason:"order if not found"})
//     }
//     //get that specific order from in memory
//     const order= orders.get(orderId)
//     if(!order){
//         return sendCallbackToRedis(orderId, "order_not_found",{reason:"order not found"})
//     }

//     //get the symbol with the help of orderId
//     const priceData=price.get(order.asset)
//     const closePrice = priceData ? (order.side === "long" ? priceData.bid : priceData.ask) : order.openingPrice;
//     const pnl = calPnL(closePrice, order.openingPrice, order.side, order.qty);

//    executeClose(order, closePrice, "manual", pnl);

// }
export type Symbol = keyof typeof SYMBOL_DECIMALS;
async function handleBalanceUpdate(payload:payloadType){
    const {userId, symbol, balanceRaw, balanceDecimal} = payload
    if(!userId || !symbol || !balanceRaw || !balanceDecimal){
        console.error("didn't get the excate data")
        return
    }
    //convert
    const rawValue = Number(balanceRaw)
    const decimals = Number(balanceDecimal) ?? SYMBOL_DECIMALS[symbol as Symbol] ?? 8;
    const actualValue = rawValue / Math.pow(10, decimals);

    setBalance(actualValue,userId,symbol)
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
    let openPrice=toEnginePrecision(dbPrice)
    let qty=toEnginePrecision(dbQuantity)

    //and putting in the memory
    orders.set(order.id, {
            id: order.id,
            userId: order.userId,
            asset: order.symbol, 
            side: order.side as Side,
            qty: qty,
            leverage: order.leverage,
            openingPrice: openPrice,
            initialMargin: multiplyInt(openPrice, qty) / BigInt(order.leverage),
            takeProfit: order.takeProfitPrice ? toEnginePrecision(Number(order.takeProfitPrice) / 100) : undefined,
            stopLoss: order.stopLossPrice ? toEnginePrecision(Number(order.stopLossPrice) / 100) : undefined,
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
        const engineScaledValue = actualValue;
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
                            // case "close-order": await handleCloseOrder(payload); break
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




//mock engine
// const redis = redisClient(); // For Reading
// const publisher = redisClient(); // For Replying (New!)

// let lastStreamId = "$";


// async function engine() {
//     console.log("Mock Engine Started...");
//     while (true) {
//         try {
//             const response = await redis.xread("BLOCK", 0, "STREAMS", "trading-engine", lastStreamId);
//             if (!response) continue;

//             for (const [streamName, messages] of response) {
//                 for (const [id, fields] of messages) {
//                     lastStreamId = id;
                    
//                     let rawData = "";
//                     for (let i = 0; i < fields.length; i += 2) {
//                         if (fields[i] === "payload") rawData = fields[i + 1] ?? "";
//                     }
//                     if (!rawData) continue;

//                     const msg = JSON.parse(rawData);
//                     const kind = msg.kind;
//                     const payload = msg.payload; // Contains all your order data

//                     if (kind === "create-order") {
//                         console.log(`[Engine] Creating Order in DB: ${payload.id}`);

//                         // 1. SAVE TO DB (Simulating Real Engine)
//                         // Ensure your payload matches your Prisma Schema types
//                         await prisma.order.create({
//                             data: {
//                                 user: { connect: { id: payload.userId } },

//                                 symbol: payload?.symbol,
//                                 side: payload.side,
//                                 status: "OPEN",

//                                 quantity: BigInt(payload.qty),
//                                 quantityDecimal: payload.quantityDecimal ?? 8,

//                                 openPrice: payload.openPrice || 100,
//                                 priceDecimals: payload.priceDecimals ?? 8,

//                                 leverage: payload.leverage,
//                                 margin: payload?.margin || 1,

//                                 takeProfitPrice: payload.takeProfitPrice ?? null,
//                                 stopLossPrice: payload.stopLossPrice ?? null,
//                             }
//                         });
//                         // 2. Reply to Redis
//                         const reply = {
//                             id: payload.id,
//                             status: "created",
//                             message: "Order successfully opened"
//                         };

//                         await publisher.xadd(
//                             "callback-queue", 
//                             "*", 
//                             "id", payload.id, 
//                             "data", JSON.stringify(reply)
//                         );
//                     } else if (kind === "close-order") {
//                         console.log(`[Engine Mock] Closing Order: ${payload.orderId}`);

//                         // 1. MOCK CALCULATIONS
//                         const mockClosePrice = 43000 * 100000000; // Mock Price
//                         const mockPnl = 50 * 100000000; // Mock Profit (50 USDC)

//                         // 2. UPDATE DB (So the status changes to CLOSED)
//                         try {
//                             await prisma.order.update({
//                                 where: {
//                                     id: payload.orderId
//                                 },
//                                 data: {
//                                     status: "CLOSED",
//                                     closePrice: mockClosePrice,
//                                     closedAt: new Date()
//                                 }
//                             });

//                             // 3. SEND REPLY TO REDIS
//                             const reply = {
//                                 id: payload.orderId,
//                                 status: "closed",
//                                 pnl: mockPnl,
//                                 message: "Order closed successfully"
//                             };

//                             await publisher.xadd(
//                                 "callback-queue", 
//                                 "*", 
//                                 "id", payload.orderId, 
//                                 "data", JSON.stringify(reply)
//                             );
//                             console.log(`[Engine Mock] Order Closed in DB & Reply Sent`);

//                         } catch (dbError) {
//                             console.error("Failed to close order in DB:", dbError);
//                             // Optional: Send error reply to Redis
//                         }
//                     }
//                 }
//             }
//         } catch (err) {
//             console.error("Mock Engine Error:", err);
//         }
//     }
// }
// engine();


