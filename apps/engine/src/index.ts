import { prisma } from "@repo/db";
import { redisClient } from "@repo/redis-client";

// Import your shared types. 
// Note: Make sure your @repo/types actually exports these now!
// import { Asset, Market } from "@repo/types"; 

import { 
    balanceType, 
    ENGINE_CONSTANTS, 
    ORDER_PRECISION, 
    precisionEngineOrder, 
    Side 
} from "./types";

const GLOBAL_ASSET = "USDC"; // The only money we care about

let isFlushingDB = false;
let price = new Map<string, { bid: bigint, ask: bigint }>();
let orders = new Map<string, precisionEngineOrder>();
// Map<UserId, Map<Asset, Balance>> 
let balance = new Map<string, Map<string, bigint>>(); 

let dbArray: any[] = [];
const redis = redisClient();
let lastStreamId = "$";

//MATH UTILS
// Scaling 8 decimals = 100,000,000
const SCALE = BigInt(Math.pow(10, 8)); 

const toEnginePrecision = (num: number): bigint => {
    return BigInt(Math.round(num * Number(SCALE)));
};

const fromEnginePrecision = (val: bigint | number): number => {
    return Number(val) / Number(SCALE);
};

const calPnL = (currentPrice: bigint, openPrice: bigint, side: Side, quantity: bigint) => {
    const normalizedSide = side.toLowerCase(); 
    const diff = normalizedSide === "LONG" ? currentPrice - openPrice : openPrice - currentPrice;
    let calculatedPnl=(diff * quantity) / SCALE;
    // console.log('calculatedPnl:',calculatedPnl)
    return calculatedPnl
};

const MARGIN_THRESHOLD = 0.05; // 5%

function checkRisk(order: precisionEngineOrder, currentPrice: bigint) {
    let pnl = calPnL(currentPrice, order.openingPrice, order.side, order.qty);
    let remainingMargin = order.initialMargin + pnl;
    
    const maintenanceMargin = (order.initialMargin * BigInt(Math.round(MARGIN_THRESHOLD * 100))) / 100n;
    let reason = null;
    // console.log('remainingMargin <= maintenanceMargin:',remainingMargin <= maintenanceMargin)
    // console.log('current price:', currentPrice)
    // console.log('what is order.takeProfit',order.takeProfit)
    // console.log('what is order.stopLoss',order.stopLoss)
    // console.log(order.side)
    //TODO:how much money i have left in my account
    if (remainingMargin <= maintenanceMargin) { 
        reason = 'LIQUIDATION';
    } else if (order.takeProfit && (
        (order.side == 'LONG' && currentPrice >= order.takeProfit) ||
        (order.side == 'SHORT' && currentPrice <= order.takeProfit)
    )) {
        reason = "TAKE_PROFIT";
    } else if (order.stopLoss && (
        (order.side == 'LONG' && currentPrice <= order.stopLoss) ||
        (order.side == 'SHORT' && currentPrice >= order.stopLoss)
        
    )) {
        reason = "STOP_LOSS";
    }
    console.log('is their any reason',reason)
    if (reason) executeClose(order, reason, currentPrice, pnl);
}

// --- BALANCE UTILS ---
async function getBalance(userId: string): Promise<bigint> {
    if (!balance.has(userId)) {
        balance.set(userId, new Map());
    }
    // ALWAYS fetch USDC. Ignore any other key.
    return balance.get(userId)?.get(GLOBAL_ASSET) ?? 0n;
}

function mutateBalance(userId: string, amount: bigint) {
    if (!balance.has(userId)) balance.set(userId, new Map());
    
    // Update In-Memory
    balance.get(userId)!.set(GLOBAL_ASSET, amount);
    console.log(balance.get(userId)!.set(GLOBAL_ASSET, amount))
    // Push to DB Queue
    queueDbAction({
        type: 'balance-update',
        payload: { 
            userId, 
            asset: GLOBAL_ASSET, 
            balanceRaw: amount, 
            updatedAt: Date.now() 
        }
    });
}

// queueDbAction({
//         type: 'balance-update',
//         payload: { 
//             userId, 
//             create:{
//                 userId:userId,
//                 balanceRaw:amount
//             },
//             update:{
//                  balanceRaw:{
//                     increment:amount
//                  }
//             }
//         }
//     });

// --- DB BATCHER ---
function queueDbAction(action: any) {
    // SAFETY FIX: Do not delete data if full. Just warn.
    if (dbArray.length >= 2000) {
        console.warn(`[DB] Queue High Load! Size: ${dbArray.length}.`);
        // Ideally: Pause Redis reading here (Backpressure)
    }
    console.log('pushing into ques')
    dbArray.push(action);
}

async function pushQueueJobsToDb() {
    // console.log('lala')
    if (isFlushingDB || dbArray.length === 0) return;
    isFlushingDB = true;

    const batch = dbArray.splice(0, ENGINE_CONSTANTS.DB_BATCH_SIZE);
    console.log('batch:',batch)

    try {
        for (let task of batch) {
            try {
                if (task.type == "balance-update") {
                    console.log('i am getting in db')
                    // NEW SCHEMA LOGIC
                    let { userId, balanceRaw } = task.payload;
                    console.log('with task.payload',task.payload)
                    
                    // We don't convert decimals here anymore. 
                    // We assume engine uses USDC precision logic or we store raw Engine Precision.
                    // For simplicity: Storing raw BigInt from engine to DB.
                    await prisma.wallet.upsert({
                        where: { userId }, // Unique constraint
                        create: { 
                            userId, 
                            asset: "USDC", // Hardcoded enum
                            balanceRaw 
                        },
                        update: { balanceRaw }
                    });

                } else if (task.type === "create_order") {
                    // Map Payload to New DB Schema
                    const { market, ...rest } = task.payload;
                    console.log('order-payload-inside_the_create_order:',task.payload)
                    await prisma.order.create({
                        data: {
                            ...rest,
                            market: market // Ensure this matches Enum (BTC_USDC)
                        }
                    });

                } else if (task.type === "order_close") {
                    console.log('close_order_getting_in_db')
                    await prisma.order.update({
                        where: { id: task.payload.id },
                        data: task.payload.update
                    });
                }
            } catch (error) {
                console.error(`[DB] Failed task ${task.type}:`, error);
                // Re-queue failed task? (Advanced topic)
            }
        }
    } catch (error) {
        console.error("[DB] Critical Batch Error:", error);
    } finally {
        isFlushingDB = false;
    }
}

setInterval(() => {
    pushQueueJobsToDb();
}, ENGINE_CONSTANTS.DB_FLUSH_INTERVAL_MS);


async function executeClose(order: precisionEngineOrder, reason: string, currentPrice: bigint, pnl: bigint) {
    let credit = order.initialMargin + pnl;
    console.log('Credit:',credit)
    if (credit < 0n) credit = 0n;

    let currentBalance = await getBalance(order.userId);
    mutateBalance(order.userId, currentBalance + credit);

    orders.delete(order.id);

    // Map reason string to DB Enum if needed
    let dbCloseReason = reason.toLowerCase(); 
    console.log('it should get close',dbCloseReason)

    queueDbAction({
        type: 'order_close',
        payload: {
            id: order.id,
            update: {
                status: "CLOSED",
                closePrice: currentPrice, // Storing Raw BigInt
                Pnl: pnl,                 // Storing Raw BigInt
                closedAt: new Date(),
                reason: dbCloseReason
            }
        }
    });

    console.log(`Order ${order.id} Closed. PnL: ${fromEnginePrecision(pnl)}`);
    
    sendCallbackToRedis(order.id, "closed", {
        pnl: fromEnginePrecision(pnl),
        currentPrice: fromEnginePrecision(currentPrice),
        reason
    });
}

async function handlePriceUpdate(payload:any) {
    // FIX 1: Parsing Logic
    let { a, b, s } = payload;
    
    // Safety: Convert string to number first, then Engine BigInt
    let ask = toEnginePrecision(Number(a)); 
    let bid = toEnginePrecision(Number(b));
    
    // FIX 2: Do NOT split the symbol. Use "BTC_USDC" as key.
    let symbol = s; 

    price.set(symbol, { ask, bid });

    for (let order of orders.values()) {
        if (order.asset !== symbol) continue;
        
        let currentPrice = order.side === 'LONG' ? bid : ask;
        checkRisk(order, currentPrice);
    }
}

async function handleCreateOrder(payload:any) {
    console.log("Creating Order:", payload.id);
    
    let { id, userId, market, side, qty, leverage, takeProfit, stopLoss } = payload;

    // symbol here comes from API as "BTC_USDC". This is our MARKET.

    if (orders.has(id)) return; 
        
    let priceData = price.get(market);
    console.log(priceData)
    if (!priceData) {
        return sendCallbackToRedis(id, "no_price", { reason: `No price for ${market}` });
    }

    let openingPrice = side === "LONG" ? priceData.ask : priceData.bid;
    let qtyInt = toEnginePrecision(Number(qty));
    console.log("qtyInt:",qtyInt)
    let lev = BigInt(leverage);
    
    //10***
    // Margin Calc
    const positionValue = (openingPrice * qtyInt) / SCALE;  //position value
    console.log('positionValue:',positionValue)
    let marginRequired = positionValue / lev;  //
    console.log('marginRequired',marginRequired) 
    //TODO: how much free margin we have
    console.log(userId)
    // FIX 3: Strict USDC Check
    let userBal = await getBalance(userId); 
    console.log('userBal',userBal)

    if (BigInt(userBal) < marginRequired) {
        return sendCallbackToRedis(id, "insufficient_balance", { reason: "Not enough USDC" });
    }
    console.log('is this the problem')
    let freeMargin=BigInt(userBal) - marginRequired
    console.log('free_margin', freeMargin)

    // Deduct Balance
    // mutateBalance(userId, userBal - marginRequired);
    mutateBalance(userId, BigInt(freeMargin));


    let order: precisionEngineOrder = {
        id, userId, asset: market, side,
        qty: qtyInt,
        leverage: Number(lev),
        openingPrice,
        status: "OPEN",
        initialMargin: marginRequired,
        takeProfit: takeProfit ? toEnginePrecision(Number(takeProfit)) : undefined,
        stopLoss: stopLoss ? toEnginePrecision(Number(stopLoss)) : undefined,
        createdAt: Date.now()
    };
    console.log('ORDER:',order)

    orders.set(id, order);       
    queueDbAction({
        type: "create_order",
        payload: {
            id,
            userId,
            market: market, // Maps to DB Enum
            side: side.toUpperCase(), // DB Enum is UPPERCASE usually
            status: "OPEN",
            
            quantity: qtyInt, 
            leverage: Number(lev),
            openPrice: openingPrice,
            initialMargin: marginRequired,
            
            takeProfitPrice: order.takeProfit,
            stopLossPrice: order.stopLoss,
            
            createdAt: new Date()
        }
    });

    sendCallbackToRedis(id, 'open', { price: fromEnginePrecision(openingPrice) });
}

async function handleCloseOrder(payload: any) {
    console.log("CLOSE_ORDER_PAYLOAD",payload)
    const { orderId, userId } = payload;
    let id=orderId
    // console.log("ORDERS MAP:",orders)
    const order = orders.get(id);
    console.log("is order exist", order)
    if (!order) {
        return sendCallbackToRedis(id, "error", { reason: "Order not found" });
    }

    if (order.userId !== userId) {
        return sendCallbackToRedis(id, "error", { reason: "Unauthorized" });
    }

    // 3. Get Live Price
    // We need the latest price to calculate final PnL
    console.log('close_order_asset')
    const priceData = price.get(order.asset);
    console.log('price_map',price)
    console.log("is priceData exist", priceData)
    
    if (!priceData) {
        return sendCallbackToRedis(id, "error", { reason: "Market price not available" });
    }

    // CRITICAL TRADING LOGIC:
    // If you are LONG, you sell to the BID (Lower price)
    // If you are SHORT, you buy from the ASK (Higher price)
    const closePrice = order.side === "LONG" ? priceData.bid : priceData.ask;
    console.log('what the close price we get',closePrice)

    // 4. Calculate PnL
    const pnl = calPnL(closePrice, order.openingPrice, order.side, order.qty);
    console.log('YES>> i need pnl',pnl)
    // 5. Execute Settlement
    // We reuse the exact same function used for Liquidations/TakeProfit
    await executeClose(order, "manual", closePrice, pnl);
}


async function handleBalanceUpdate(payload: any) {
    const { depositId, userId, balanceRaw } = payload;
    
    // We implicitly trust that the API only sends this for USDC now
    // mutateBalance(userId, BigInt(balanceRaw));
    if (!balance.has(userId)) balance.set(userId, new Map());
    
    balance.get(userId)!.set(GLOBAL_ASSET, balanceRaw);

    sendCallbackToRedis(depositId, 'balance_updated', {
        id: depositId,
        userId,
        balanceRaw
    });
}

// loading the state in the in memory
async function loadState() {
    console.log('Restoring State from DB...');

    // 1. Load Orders
    const dbOrders = await prisma.order.findMany({ where: { status: 'OPEN' } });
    
    for (let order of dbOrders) {
        orders.set(order.id, {
            id: order.id,
            userId: order.userId,
            asset: order.market, // "BTC_USDC"
            side: order.side === "LONG" ? "LONG" : "SHORT",
            qty: order.quantity, // already BigInt
            status: "OPEN",
            leverage: order.leverage,
            openingPrice: order.openPrice, // alredy BigInt
            initialMargin: order.initialMargin, // already BigInt
            takeProfit: order.takeProfitPrice ?? undefined,
            stopLoss: order.stopLossPrice ?? undefined,
            createdAt: order.createdAt.getTime()
        });
    }

    // 2. Load Balances
    const dbWallets = await prisma.wallet.findMany();
    for (let wallet of dbWallets) {
        if (!balance.has(wallet.userId)) balance.set(wallet.userId, new Map());
        // Always set USDC
        balance.get(wallet.userId)!.set(GLOBAL_ASSET, wallet.balanceRaw);
    }
    
    console.log(`Restored ${dbOrders.length} orders and ${dbWallets.length} wallets.`);
}

async function sendCallbackToRedis(id: string, status: string, payload: any) {
    try {
        await redis.xadd("callback_queue", "*", "id", id, "status", status, "payload", JSON.stringify(payload));
    } catch (err) {
        console.error("Redis Error:", err);
    }
}

// the main loop
async function engine() {
    await loadState();
    console.log("Engine Started 🚀");

    while (true) {
        try {
            const response = await redis.xread("BLOCK", 0, "STREAMS", "trading-engine", lastStreamId);
            if (!response) continue;

            for (const [stream, messages] of response) {
                for (const [id, fields] of messages) {
                    lastStreamId = id;
                    let rawData = "";
                    
                    // parsing
                    for (let i = 0; i < fields.length; i += 2) {
                        if (fields[i] === "data" || fields[i] === "payload") {
                            rawData = fields[i + 1] ?? "";
                        }
                    }

                    if (!rawData) continue;
                    const msg = JSON.parse(rawData);
                    const kind = msg.kind || msg.type;
                    const payload = msg.payload || msg.data;

                    switch (kind) {
                        case "price-update": await handlePriceUpdate(payload); break;
                        case "create-order": await handleCreateOrder(payload); break;
                        case "close-order": await handleCloseOrder(payload)// Add logic if you have specific close handler
                            break;
                        case "balance-update": await handleBalanceUpdate(payload); break;
                    }
                }
            }
        } catch (err) {
            console.error("Engine Loop Error:", err);
        }
    }
}

engine();