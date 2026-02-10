import {redisClient} from '@repo/redis-client'


type EngineResponse = Record<string, any>;
type ResolveFunction = (data: EngineResponse) => void;

const publishClient= redisClient()
const subscriberClient= redisClient()


console.log("PUB === SUB:", publishClient === subscriberClient);
const pendingRequest= new Map<string,ResolveFunction>()
const ActiveTimeout=new Map<string,NodeJS.Timeout>()

// const STREAMS = {
//     INPUT: "trading-engine",
//     OUTPUT: "callback_queue"
// };



const parseStreamData = (rawFields: string[]): EngineResponse => {
    const data: EngineResponse = {}
    //iterate two steps at a time (key=i, value=i+1)
    for (let i = 0; i < rawFields.length; i += 2) {
        //ensuring both key and value exist before assigning
        const key = rawFields[i];
        const value = rawFields[i + 1];
        if (key !== undefined && value !== undefined) {
            data[key] = value
        }
    }
    return data
}
// export function startRedisListener() {
//     if (!isListening) listeningToStream();
// }
let isListening:Boolean=true
async function listeningToStream() {
    if (!isListening) return;
    isListening = false;
    console.log('listening');

    let lastId = "$";

    while (true) {
        try {
            const stream = await subscriberClient.xread(
                "BLOCK", 0,
                "STREAMS", "callback_queue", lastId
            );

            const streamKey = stream?.[0];
            if (!streamKey || !streamKey[1] || streamKey[1].length === 0) continue;

            const messages = streamKey[1]; 
            for (const [streamMsgId, rawBody] of messages) {
                lastId = streamMsgId as string;

                const redisObj = parseStreamData(rawBody as string[]);

                let finalData: any = { ...redisObj };
                if (redisObj.payload && typeof redisObj.payload=="string") {
                    try {
                        const parsedPayload = JSON.parse(redisObj.payload);
                        finalData = { ...finalData, ...parsedPayload };
                    } catch (e) {
                        console.error("JSON Parse Error:", e);
                    }
                }

                //  get the request id
                // engine sends id or orderId inside the payload
                const requestId = finalData.id || finalData.orderId; 

                if (requestId && pendingRequest.has(requestId)) {
                    const resolve = pendingRequest.get(requestId);
                    const timeout = ActiveTimeout.get(requestId);

                    if (timeout) {
                        clearTimeout(timeout);
                    }

                    pendingRequest.delete(requestId);
                    ActiveTimeout.delete(requestId);


                    if (resolve){
                       resolve(finalData);
                        subscriberClient.xdel("callback_queue", streamMsgId).catch(console.error);   
                    }
                    isListening = true 
                    return finalData
                }
            }
        } catch (err) {
            console.error("[Redis:Listener] 🔴 Polling error:", err);
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

//TODO:??
export async function engineDispatcher(requestId:string, payload:Record<string,any>, timeoutMS:number):Promise<Record<string,any>>{
     listeningToStream();
     
    return new Promise((resolve, reject)=>{
        const timeout=setTimeout(()=>{
            if(pendingRequest.has(requestId)){
                pendingRequest.delete(requestId)
                ActiveTimeout.delete(requestId)
                return reject(new Error("can't process the payment"))
            }

        },timeoutMS)


        pendingRequest.set(requestId,resolve)
        ActiveTimeout.set(requestId,timeout)

        publishClient.xadd(
            "trading-engine",
            "*",
            "id",requestId,
            "payload", JSON.stringify(payload)
        ).catch(()=>{
            clearTimeout(timeout);
            pendingRequest.delete(requestId);
            ActiveTimeout.delete(requestId);
            reject(new Error(`[Redis:Publish] Failed to publish request ${requestId}`))
        })
    })
}


