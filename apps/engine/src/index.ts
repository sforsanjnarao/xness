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
const toInt = (val: number) => Math.round(val * 100_000_000); 
//read data from the stream (needs a loop in Block)
//process the data 
//put everything in the db
//response back to the backend
const price= new Map<string,{bid:number,ask:number}>()
//orderId,{engineOrder}
const orders= new Map<string,engineOrder>() //all orders is gonna be here from the db
const balance=new Map<string,Map<string,number>>() //userId->symbol,money
type payloadType=Record<any,any>

let dbArray:any=[]

const redis=redisClient()

let lastStreamId="$"
const fromInt = (val: number) => val / ENGINE_CONSTANTS.PRECISION_SCALE; 

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
    if(reason) executeClose(orders,reason,currentPrice,pnl)


   
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




function executeClose(orders:Map<string, engineOrder>,
    reason:,
    currentPrice,
    pnl
){
    //make credit by ur self
    let credit=orders.initialMargin + pnl
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
        id:orders.id,
        update:{
            status:"closed",
            //convert then into db one
            closePrice: Math.round(fromInt(currentPrice) * ORDER_PRECISION.PRICE),
            pnl: Math.round(fromInt(pnl) * ORDER_PRECISION.PRICE),
            closedAt: Date.now(),
            reason:dbCloseReason
        }
    }
   })

   console.log(`Order ${orders.id} close with this ${pnl}`)
    //sending close data to the queue
    sendCallbackToRedis(orders.id, "closed",{pnl:fromInt(pnl),currentPrice:fromInt(currentPrice), reason})
}

//if the order got produced or not
// and put it in the redis callback
async function sendCallbackToRedis(orderId:string,status:string ,payload:any){
   try{
     //crating an message for the queue 
        await redis.xadd(
            "*",
            "callback_queue",
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
    let ask=Number(a) //make it bigint
    let bid=Number(b)  //make it bigint
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
async function createOrder(payload:payloadType) {
    const {id,userId,side,symbol,qty,leverage,takeProfit,stopLoss}=payload

    const priceData=price.get(symbol)
    if(!priceData){
        return sendCallbackToRedis(id,'closed', {reason:"pice_don't exist"})
    }
    
    const openingPrice=side==='long'? priceData.ask : priceData.bid

    //initialMargin=(priceOfAnAsset*qty)/leverage
    const initialMargin=openingPrice*qty/leverage //conterv to int
    //floating point no. math not good

    //lock the money with initialMargin
    const bal=balance.get(userId)?.get('USDC')
    //also write if u didn't get the make a trip to db
    if(!bal) return sendCallbackToRedis(id,'failed_to_create',{reason:"didn't get the balance"})
    if(bal<initialMargin){
        return sendCallbackToRedis(id,"balance_inefficient",{reason:'balance_inefficient'})
    }
    //update balance code here-> bal-IM
    balance.get(userId)?.set("USDC",bal-initialMargin)

    if(orders.has(id)){
        return //sendCallback
    }
    //store order in ram
    orders.set(id,
        {
            id:id,
            userId,
            asset:symbol,
            side:side,
            openingPrice:openingPrice,
            initialMargin:initialMargin,
            createdAt:Date.now(),
            qty,
            leverage,
            takeProfit, //convert to int
            stopLoss    //int
            
        }
    )


    //now put the open order in dbArray

    //and give the message to user for the order created
    sendCallbackToRedis(id,'order_created',{reason:"order created successfully"})
    
}
async function handleCreateOrder(payload:payloadType){
    //get the payload
    const {id, userId, asset, side, qty, leverage, takeProfit, stopLoss}=payload
    //validate everything
    const normalizedAsset = asset.toUpperCase();


    if (orders.has(id)) return;  //u can crete the order which already exist

    const priceData = price.get(normalizedAsset);

    if (!priceData) {
        return sendCallbackToRedis(id, "no_price", { reason: "Price data not available for asset" });
    }

    const openingPrice = side === "long" ? priceData.ask : priceData.bid;
    const qtyInt = toInt(Number(qty));
    const lev = Number(leverage) || 1;
    //some margin stuff
    const totalValue = multiplyInt(openingPrice, qtyInt);
    const marginRequired = Math.round(totalValue / lev)

    const userBal = getBalance(userId, "USDC");
    if (userBal < marginRequired) {
        return sendCallbackToRedis(id, "insufficient_balance", { reason: "Not enough balance for margin requirement" })
    }


    //update balance
    setBalance(20,userId ,asset)

    //need to make the order
    const order: engineOrder = {
            id, userId, asset: normalizedAsset, side,
            qty: qtyInt,
            leverage: lev,
            openingPrice,
            initialMargin: marginRequired,
            takeProfit: takeProfit ? toInt(Number(takeProfit)) : undefined,
            stopLoss: stopLoss ? toInt(Number(stopLoss)) : undefined,
            createdAt: Date.now()
        }
    //set new order in-memory  
    orders.set(id,order)

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
            openPrice: Math.round(fromInt(openingPrice) * ORDER_PRECISION.PRICE),
            priceDecimals: 2,
            margin: Math.round(fromInt(marginRequired) * ORDER_PRECISION.PRICE),
            status: "open",
            createdAt: new Date()
        }
    })
    console.log('pushed to db')

    //notify the user
    sendCallbackToRedis(id,'created',{price: fromInt(openingPrice)})
}

async function handleCloseOrder(payload:payloadType){
    //get the payload
    const {userId, orderId}=payload
    if(!orderId){
        return sendCallbackToRedis(orderId, "order_not_found",{reason:"order if not found"})
    }
    //get that specific order from in memory
    const order= orders.get(orderId)
    if(!order){
        return sendCallbackToRedis(orderId, "order_not_found",{reason:"order not found"})
    }

    //get the symbol with the help of orderId
    const priceData=price.get(order.asset)
    const closePrice = priceData ? (order.side === "long" ? priceData.bid : priceData.ask) : order.openingPrice;
    const pnl = calPnL(closePrice, order.openingPrice, order.side, order.qty);

   executeClose(order, closePrice, "manual", pnl);

}
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
                        // switch(kind){
                        //     //market price update
                        //     case "price-update": await handlePriceUpdate(payload); break
                        //     case "create-order": await handleCreateOrder(payload); break
                        //     case "close-order": await handleCloseOrder(payload); break
                        //     //wallet updates
                        //     case "balance-update": await handleBalanceUpdate(payload); break
                        //     default: console.log("can't find this kind")
                        // }
                        switch(kind){
                            //market price update
                            case "price-update": await console.log('PRICE____UPDATED'); break
                            case "create-order": await console.log('CREATE___ORDER'); break
                            case "close-order": await console.log('CLOSE____ORDER'); break
                            //wallet updates
                            case "balance-update": console.log('BALANCE___UPDATE'); break
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



