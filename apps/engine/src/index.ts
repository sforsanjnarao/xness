import { prisma } from "@repo/db";
import { redisClient } from "@repo/redis-client";
import { 
    ENGINE_CONSTANTS, 
    precisionEngineOrder, 
    Side 
} from "./types";

const GLOBAL_ASSET = "USDC"; 

let isFlushingDB = false;
let price = new Map<string, { bid: bigint, ask: bigint }>();
let orders = new Map<string, precisionEngineOrder>();
let balance = new Map<string, Map<string, bigint>>(); 

let dbArray: any[] = [];
const redis = redisClient();
let lastStreamId = "$";


// Scaling 8 decimals = 100,000,000
const SCALE = BigInt(Math.pow(10, 8)); 

const toEnginePrecision = (num: number): bigint => {
    return BigInt(Math.round(num * Number(SCALE)));
};

const fromEnginePrecision = (val: bigint | number): number => {
    return Number(val) / Number(SCALE);
};

const calPnL = (currentPrice: bigint, openPrice: bigint, side: Side, quantity: bigint) => {
    const normalizedSide = side.toLocaleUpperCase(); 
    const diff = normalizedSide === "LONG" ? currentPrice - openPrice : openPrice - currentPrice;
    let calculatedPnl=(diff * quantity) / SCALE;
    return calculatedPnl
};

const MARGIN_THRESHOLD = 0.05; // 5%

function checkRisk(order: precisionEngineOrder, currentPrice: bigint) {
    let pnl = calPnL(currentPrice, order.openingPrice, order.side, order.qty);
    let remainingMargin = order.initialMargin + pnl;
    
    const maintenanceMargin = (order.initialMargin * BigInt(Math.round(MARGIN_THRESHOLD * 100))) / 100n;
    let reason = null;
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
    if (reason) executeClose(order, reason, currentPrice, pnl);
}

async function getBalance(userId: string): Promise<bigint> {
    if (!balance.has(userId)) {
        balance.set(userId, new Map());
    }
    return balance.get(userId)?.get(GLOBAL_ASSET) ?? 0n;
}

function mutateBalance(userId: string, amount: bigint) {
    if (!balance.has(userId)) balance.set(userId, new Map());
    
    balance.get(userId)!.set(GLOBAL_ASSET, amount);
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

function queueDbAction(action: any) {
    if (dbArray.length >= 2000) {
        console.warn(`[DB] Queue High Load! Size: ${dbArray.length}.`);
    }
    dbArray.push(action);
}

async function pushQueueJobsToDb() {
    if (isFlushingDB || dbArray.length === 0) return;
    isFlushingDB = true;

    const batch = dbArray.splice(0, ENGINE_CONSTANTS.DB_BATCH_SIZE);

    try {
        for (let task of batch) {
            try {
                if (task.type == "balance-update") {
                    let { userId, balanceRaw } = task.payload;
                    
                    await prisma.wallet.upsert({
                        where: { userId }, 
                        create: { 
                            userId, 
                            asset: "USDC", 
                            balanceRaw 
                        },
                        update: { balanceRaw }
                    });
                } else if (task.type === "create_order") {
                    const { market, ...rest } = task.payload;
                    await prisma.order.create({
                        data: {
                            ...rest,
                            market: market 
                        }
                    });
                } else if (task.type === "order_close") {
                    await prisma.order.update({
                        where: { id: task.payload.id },
                        data: task.payload.update
                    });
                }
            } catch (error) {
                console.error(`[DB] Failed task ${task.type}:`, error);
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
    if (credit < 0n) credit = 0n;

    let currentBalance = await getBalance(order.userId);
    mutateBalance(order.userId, currentBalance + credit);

    orders.delete(order.id);

    let dbCloseReason = reason.toLowerCase(); 

    queueDbAction({
        type: 'order_close',
        payload: {
            id: order.id,
            update: {
                status: "CLOSED",
                closePrice: currentPrice, 
                Pnl: pnl,                 
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
    let { a, b, s } = payload;
    
    let ask = toEnginePrecision(Number(a)); 
    let bid = toEnginePrecision(Number(b));
    
    let symbol = s; 

    price.set(symbol, { ask, bid });

    for (let order of orders.values()) {
        if (order.asset !== symbol) continue;
        
        let currentPrice = order.side === 'LONG' ? bid : ask;
        checkRisk(order, currentPrice);
    }
}

async function handleCreateOrder(payload:any) {
    
    let { id, userId, market, side, qty, leverage, takeProfit, stopLoss } = payload;

    if (orders.has(id)) return; 
        
    let priceData = price.get(market);
    if (!priceData) {
        return sendCallbackToRedis(id, "no_price", { reason: `No price for ${market}` });
    }

    let openingPrice = side === "LONG" ? priceData.ask : priceData.bid;
    let qtyInt = toEnginePrecision(Number(qty));
    let lev = BigInt(leverage);
    
    //10***
    // Margin Calc
    const positionValue = (openingPrice * qtyInt) / SCALE;  //position value
    let marginRequired = positionValue / lev; 
    //TODO: how much free margin we have
    let userBal = await getBalance(userId); 

    if (BigInt(userBal) < marginRequired) {
        return sendCallbackToRedis(id, "insufficient_balance", { reason: "Not enough USDC" });
    }
    let freeMargin=BigInt(userBal) - marginRequired

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

    orders.set(id, order);       
    queueDbAction({
        type: "create_order",
        payload: {
            id,
            userId,
            market: market, 
            side: side.toUpperCase(), 
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
    const { orderId, userId } = payload;
    let id=orderId
    const order = orders.get(id);
    if (!order) {
        return sendCallbackToRedis(id, "error", { reason: "Order not found" });
    }
    if (order.userId !== userId) {
        return sendCallbackToRedis(id, "error", { reason: "Unauthorized" });
    }
    const priceData = price.get(order.asset);
    
    if (!priceData) {
        return sendCallbackToRedis(id, "error", { reason: "Market price not available" });
    }

    const closePrice = order.side === "LONG" ? priceData.bid : priceData.ask;
    const pnl = calPnL(closePrice, order.openingPrice, order.side, order.qty);
    await executeClose(order, "manual", closePrice, pnl);
}


async function handleBalanceUpdate(payload: any) {
    const { depositId, userId, balanceRaw } = payload;
    // mutateBalance(userId, BigInt(balanceRaw));
    if (!balance.has(userId)) balance.set(userId, new Map());
    
    balance.get(userId)!.set(GLOBAL_ASSET, balanceRaw);
    sendCallbackToRedis(depositId, 'balance_updated', {
        id: depositId,
        userId,
        balanceRaw
    });
}

async function loadState() {
    const dbOrders = await prisma.order.findMany({ where: { status: 'OPEN' } });
    
    for (let order of dbOrders) {
        orders.set(order.id, {
            id: order.id,
            userId: order.userId,
            asset: order.market, 
            side: order.side === "LONG" ? "LONG" : "SHORT",
            qty: order.quantity, 
            status: "OPEN",
            leverage: order.leverage,
            openingPrice: order.openPrice, 
            initialMargin: order.initialMargin, 
            takeProfit: order.takeProfitPrice ?? undefined,
            stopLoss: order.stopLossPrice ?? undefined,
            createdAt: order.createdAt.getTime()
        });
    }

    const dbWallets = await prisma.wallet.findMany();
    for (let wallet of dbWallets) {
        if (!balance.has(wallet.userId)) balance.set(wallet.userId, new Map());
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

async function engine() {
    await loadState();
    while (true) {
        try {
            const response = await redis.xread("BLOCK", 0, "STREAMS", "trading-engine", lastStreamId);
            if (!response) continue;

            for (const [stream, messages] of response) {
                for (const [id, fields] of messages) {
                    lastStreamId = id;
                    let rawData = "";
                    
                    // console.log("fields:", fields)
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
                        case "close-order": await handleCloseOrder(payload);  break;
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