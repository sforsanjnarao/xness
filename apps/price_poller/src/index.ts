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


export enum MarketSymbol{
    BTC_USDC = "BTC_USDC",
    SOL_USDC = "SOL_USDC",
    ETH_USDC = "ETH_USDC"
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
    host:"127.0.0.1",
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
    }, 180000); // 3 min
  });

  ws.on("pong", () => {
    console.log("pong");
  });

  ws.on("message", (data) => {
    const msg = JSON.parse(data.toString());
    console.log('lalala')
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
    ws.close(); // triggers close handler
  });
}

function shutdown() {
  manuallyClosed = true;
  if (heartbeat) clearInterval(heartbeat);
  ws?.close();
}

connect();


function structuredData(msg:message){
    sendItToRedisStream(msg)
}



async function sendItToRedisStream(msg:message){
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