import {redisClient} from '@repo/redis-client'


type EngineResponse = Record<string, string>;
type ResolveFunction = (data: EngineResponse) => void;

interface engineDispatcherInputType{
 requestId:string,
 payload:Record<string,string>
 timeoutMS: 5000
}
const publishClient= redisClient()
const subscriberClient= redisClient()

const pendingRequest= new Map<string,ResolveFunction>()
const ActiveTimeout=new Map<string,NodeJS.Timeout>()



const parseStreamData = (rawFields: string[]): EngineResponse => {
    const data: EngineResponse = {}
    //iterate two steps at a time (key=i, value=i+1)
    for (let i = 0; i < rawFields.length; i += 2) {
        //Ensure both key and value exist before assigning
        const key = rawFields[i];
        const value = rawFields[i + 1];
        if (key !== undefined && value !== undefined) {
            data[key] = value
        }
    }
    return data
}

let isListening:Boolean=false
async function listeningToStream(){
    if(isListening) return
    isListening=true


    let lastId="$"

    async function listenForNewMessage(){
       try{
            let stream= await subscriberClient.xread(
                        "BLOCK",
                        0,
                        "STREAMS",
                        "queue",
                        lastId
                    )

            if(!stream || stream?.length==0){
                return setImmediate(()=>listenForNewMessage())
            }

            let streamData=stream[0]
            if(!streamData){
                return setImmediate(()=>listenForNewMessage())
            }

            const message= streamData[1]
            for(const [streamMsgId, rawBody] of message){


                lastId=streamMsgId as string

                let responseData=parseStreamData(rawBody)

                const trackId= responseData.id

                if(trackId && pendingRequest.has(trackId)){
                    const resolveFunction= pendingRequest.get(trackId)

                    //cleanup
                    let timeoutTimer=ActiveTimeout.get(trackId)
                    if(timeoutTimer) clearTimeout(timeoutTimer)

                    pendingRequest.delete(trackId)
                    ActiveTimeout.delete(trackId)

                    subscriberClient.xdel("queue",streamMsgId).catch(err => {
                            console.error(`[Redis:Listener] Failed to XDEL message ${streamMsgId}`, err)
                        })
                    if(resolveFunction){
                        resolveFunction(responseData)
                    }
                    
                }
                
            }
            console.log(message)
        }catch(err){
            console.error("[Redis:Listener] 🔴 Polling error. Retrying in 2s...", err);
                setTimeout(listenForNewMessage, 5000)
        }
        setImmediate(listenForNewMessage)
       }
        setImmediate(listenForNewMessage)  
}

export function engineDispatcher(requestId:string, payload:Record<string,any>, timeoutMS:number):Promise<Record<string,any>>{

    if(!isListening){
        listeningToStream()
    }


    return new Promise((resolve, reject)=>{
        const timeout=setTimeout(()=>{
            if(pendingRequest.has(requestId)){
                pendingRequest.delete(requestId)
                ActiveTimeout.delete(requestId)
                return reject(new Error("can't process the payment"))
            }

        },5000)


        pendingRequest.set(requestId,resolve)
        ActiveTimeout.set(requestId,timeout)

        publishClient.xadd(
            "trading-engine",
            "*",
            "payload", JSON.stringify(payload)
        ).catch(()=>{
            clearTimeout(timeout);
            pendingRequest.delete(requestId);
            ActiveTimeout.delete(requestId);
            reject(new Error(`[Redis:Publish] Failed to publish request ${requestId}`))
        })
    })
}


