import WebSocket from "ws";

import Redis from 'ioredis'
// {
//   data: {
//     A: '0.00029',
//     B: '0.01734',
//     E: 1766653593030220,
//     T: 1766653593028162,
//     a: '87483.7',
//     b: '87473.0',
//     e: 'bookTicker',
//     s: 'BTC_USDC',
//     u: 2208332373
//   },
//   stream: 'bookTicker.BTC_USDC'
// }


//  1) "1766738936470-0"
//      2)  1) "kind"
//          2) "price-update"
//          3) "symbol"
//          4) "BTC_USDC"
//          5) "bid"
//          6) "88629.8"
//          7) "ask"
//          8) "88641.1"
//          9) "eventTime"
//         10) "1766738936436930"
//         11) "receivedAt"
//         12) "1766738936471"


export enum MarketSymbol{
    BTC_USDC = "BTC",
    SOL_USDC = "SOL",
    ETH_USDC = "ETH"
}

export type message={
    data:{
        A: string;     // ask quantity
        B: string;     // bid quantity
        E: number;     // event time
        T: number;     // transaction time
        a: string;     // ask price
        b: string;     // bid price
        e: 'bookTicker';     
        s: MarketSymbol;// symbol (BTC_USDC)
        u: number;      // update id
    },
    stream: `bookTicker.${MarketSymbol}`;     // bookTicker.BTC_USDC
}
export interface PriceEvent {
    kind: "price-update";
    payload: message;
    receivedAt: number;
}

export const redisClient=new Redis({
    host:"redis",
    // host:"localhost",
    port:6379
})
redisClient
redisClient.on('connecting',()=>{
    console.log('redis client is connected')
})


const WS_URL = "wss://ws.backpack.exchange";

let ws: WebSocket;
let heartbeat: NodeJS.Timeout | null = null;
let manuallyClosed = false;

function connect() {
  manuallyClosed = false;

  ws = new WebSocket(WS_URL);

  ws.on("open", () => {
    console.log("Connected to server");

    ws.send(JSON.stringify({
      method: "SUBSCRIBE",
      params: [
        "bookTicker.BTC_USDC",
        "bookTicker.SOL_USDC",
        "bookTicker.ETH_USDC"
      ],
      id: Date.now()
    }));

    heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 180000);
  });

  ws.on("pong", () => {
    console.log("pong");
  });

  ws.on("message", (data) => {
    const msg = JSON.parse(data.toString());
    // console.log('lalala')
    structuredData(msg)
  });

  ws.on("close", () => {
    console.log("Socket closed");
    if (heartbeat) clearInterval(heartbeat);

    if (!manuallyClosed) {
      console.log("Unexpected close. Reconnecting in 5s...");
      setTimeout(connect, 5000);
    }
  });

  ws.on("error", (err) => {
    console.error("WS Error:", err.message);
    ws.close(); 
  });
}

// function shutdown() {
//   manuallyClosed = true;
//   if (heartbeat) clearInterval(heartbeat);
//   ws?.close();
// }

connect();


function structuredData(msg:message){
    sendItToRedisStream(msg)
}



async function sendItToRedisStream(msg: message) {
    try {
        const event: PriceEvent = {
            kind: "price-update",
            payload: msg,
            receivedAt: Date.now()
        }
        
        await redisClient.xadd(
            "trading-engine",
            "*",
            "data", JSON.stringify({
                kind: "price-update",
                payload: {
                    s: event.payload.data.s,
                    b: event.payload.data.b,
                    a: event.payload.data.a,
                    E: event.payload.data.E
                }
            })
        )
        // console.log("Written to Redis:", msg.data.s);
    } catch (err) {
        console.error('err:', err)
    }
}













async function sendItRedisStream(msg:message){
    try{
        const event:PriceEvent={
            kind: "price-update",
            payload: msg,
            receivedAt: Date.now()
        }
        await redisClient.xadd(
            "trading-engine",
            "*",
            "kind", event.kind,
            "symbol", event.payload.data.s,
            "bid", event.payload.data.b,
            "ask", event.payload.data.a,
            "eventTime", event.payload.data.E.toString(),
            "receivedAt", event.receivedAt.toString()
        )
        console.log("Written to Redis:", msg.data.s);
    }catch(err){
        console.error('err:',err)
    }
    
}