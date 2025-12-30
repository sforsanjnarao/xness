import { Request, Response } from "express"
import { engineDispatcher } from "../redis.client.engine"

enum orderSides{
    LONG= "long",
    SHORT="short"
}
enum orderStatus{
    OPEN = "open",
    CLOSED = "closed",
    LIQUIDATED = "liquidated"
}
enum orderSymbol{

}
type futureMarketOrderTypes={
    id:string
    userId:string
    side:orderSides
    symbol:orderSymbol
    status:orderStatus
    quantity:number
    entryPrice: number
    closePrice: number
    takeProfitPrice?:number
    stopLossPrice?:number
    Margin:number
    leverage:number
    pnl:number
    createdAt: number
}

//QUESTION: what an order(future order) consist of
const futureMarketOrder:futureMarketOrderTypes[]=[]

//get end point to get all the orders of a user
export const getOrder=(req:Request, res:Response)=>{
    try{
        const userId=req.user?.id
        if(!userId) return res.status(401).json({error:'unauthorize'}) //401 = unauthorized
        let allOrder=futureMarketOrder.filter(order=>order.userId===userId)
            return res.status(200).json({message:'success', allOrder})
    }catch(err){
        console.error(err)
        res.status(500).json({error:'Internal server error'})
    }
    
}


export const createOrder=async (req:Request, res:Response)=>{
   try{
        const userId= req.user?.id
        if(!userId) return res.status(401).json({error:'unauthorize'})
        //zod verification required
        const {side, quantity,symbol,margin, leverage } =req.body
        //check the requireMargin
        

        //create an order id
        const orderId=crypto.randomUUID()

        //wrap all in the payload
        const payload={
            kind:'create-order',
            data:{
                orderId,
                userId,
                side,
                quantity,
                symbol,
                margin,
                leverage,
                enqueuedAt: Date.now()
            }
        }
        //need to send all of this to the engine to process
        let engineResponse= await engineDispatcher(orderId,payload,5000)
        if(engineResponse.status==='created'){
            return res.status(201).json({message:'your order is created', engineResponse, orderId})
        }
        res.status(409).json({error:'failed to create order or timeout',engineResponse, orderId})
        
   }catch(err){
        console.error(err)
        res.status(500).json({error:'internal server error'})
   }
}

export const getOrderById=(req:Request, res:Response)=>{
    try{
        const userId=req.user?.id
        if(!userId){
            return res.status(401).json({error:'unauthorized'})
        }
        const {orderId} =req.params
        //find users order 
        const order=futureMarketOrder.find(order=>order.id==orderId &&order.userId==userId )
        if(!order){
            return res.status(404).json({error:'order not found'})
        }
        return res.status(200).json({message:'order', order})
    }catch(err){
        console.error(err)
        return res.status(500).json({error:'internal server error'})
    }
    
}


export const closeOrder=async (req:Request, res:Response)=>{
    try{
        const userId= req.user?.id
        if(!userId) return res.status(401).json({error:'unauthorize'})
        //if don't have userId
        const {orderId}= req.params
        if(!orderId) return res.status(400).json({error:'order id is required'})
        //if don't have userId
        const {closeReason='manual'}=req.body
        

        //verify it belong to the same user or not
        let closeOrderId=futureMarketOrder.find(order=>order.id==orderId && order.userId==userId &&order.status=="open")
        if(!closeOrderId){
            return res.status(404).json({error:"order not found"})
        }
        const payload={
            kind:'close-order',
            data:{
                orderId,
                userId, //ownership is required
                closeReason:closeReason
            }
        }

        const engineResponse=await engineDispatcher(orderId, payload, 5000)
        if(engineResponse.status=="closed"){
            return res.status(200).json({message:'order closed successfully'})
        }
        return res.status(409).json({error:'fail to close the order or timeout'})
    }catch(err){
        console.error(err)
        return res.status(500).json({error:'internal server error'})
    }
}