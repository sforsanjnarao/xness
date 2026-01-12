import { Request, Response } from "express"
import { engineDispatcher } from "../redis.client.engine"
import { prisma } from "@repo/db"
        import crypto from "crypto";




function mapEngineResponse(res: Response, status: any, orderId: string) {
    switch (status) {
        case "insufficient_balance":
            return res.status(400).json({
                error: "insufficient balance",
                message: "Not enough balance to place order"
            })

        case "no_price":
            return res.status(400).json({
                error: "Price not available",
                message: "Market price is currently unavailable. Please try again later.",
            });

        case "invalid_size":
            return res.status(400).json({
                error: "Invalid size",
                message: "The order size is invalid",
            })

        case "invalid_order":
            return res.status(400).json({
                error: "Invalid order",
                message: "The order parameters are invalid",
            })

        case "order_not_found":
            return res.status(404).json({
                error:"Order Not Found",
                message:"The order are not found by the engine"
            })
        case "already_closed":
            return res.status(404).json({
                error: "Order Closed",
                message: "The Order cannot be closed because it is not open or does not exists."
            })

        default:
            console.error(`[Order] Unhandled engine status '${status}' for order ${orderId}`)
            return res.status(500).json({ error: "Execution Error", message: "The order Engine returned an unexpected status." })
    }
}


//get end point to get all the orders of a user
export const getOrder=async (req:Request, res:Response)=>{
    try{
        const userId=req.user?.id
        if(!userId) return res.status(401).json({error:'unauthorize'}) //401 = unauthorized
        // let allOrder=futureMarketOrder.filter(order=>order.userId===userId)
        let allOrder=await prisma.order.findMany({
            where:{
                userId: userId
            }
        })
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
        const {side, quantity, leverage, takeProfit, stopLoss } =req.body

        // i made this function because of a glitch 
        //i need resolve in orderId
        function createEngineId(prefix: string) {
        const uuid = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
        const time = Date.now().toString(36);

        return `${prefix}_${time}_${uuid}`;
}

        //create an order id
        const orderId=createEngineId("ORDER_Id:")

        //wrap all in the payload
        const payload={
            kind:'create-order',
            payload: {
                id: orderId,
                userId,
                asset:'USDC',
                side,
                status: "OPEN",
                qty: Number(quantity),
                leverage: Number(leverage),

                takeProfit: takeProfit != null ? Number(takeProfit) : null,
                stopLoss: stopLoss != null ? Number(stopLoss) : null,
                enqueuedAt: Date.now(),
            },
        }
        console.log("PAYLOAD:",payload)
        //need to send all of this to the engine to process
        let engineResponse= await engineDispatcher(orderId,payload,5000)
         console.log("engineResponse:",engineResponse)
        if(engineResponse.status=='open'){
            return res.status(201).json({message:'your order is created', engineResponse, orderId})
        }
        mapEngineResponse(res,engineResponse.status,orderId)
        // res.status(409).json({error:'failed to create order or timeout',engineResponse, orderId})
        
   }catch(err){
        console.error(err)
        res.status(500).json({error:'internal server error'})
   }
}

export const getOrderById=async (req:Request, res:Response)=>{
    try{
        const userId=req.user?.id
        if(!userId){
            return res.status(401).json({error:'unauthorized'})
        }
        const {orderId} =req.params
        //find users order 
        // const order=futureMarketOrder.find(order=>order.id==orderId &&order.userId==userId )
        const order=await prisma.order.findUnique({
            where:{
                id:orderId
            }
        })
        if(!order){
            return res.status(404).json({error:'order not found'})
        }
        
        return res.status(200).json({message:'order', order})
    }catch(err){
        console.error(err)
        return res.status(500).json({error:'internal server error'})
    }
    
}
export const getOpenOrders = async (req: Request, res: Response) => {
    try{
        const userId=req.user?.id
        if(!userId) return res.status(401).json({error:'unauthorize'}) //401 = unauthorized
        // let allOrder=futureMarketOrder.filter(order=>order.userId===userId)
        console.log('auth')
        let allOrder=await prisma.order.findMany({
            where:{
                userId: userId,
                status:"OPEN"
            }
        })
            return res.status(200).json({message:'success', allOrder})
    }catch(err){
        console.error(err)
        res.status(500).json({error:'Internal server error'})
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
        const {closeReason}=req.body
        

        //verify it belong to the same user or not
        // let closeOrderId=futureMarketOrder.find(order=>order.id==orderId && order.userId==userId &&order.status=="open")
        let closeOrderId=await prisma.order.findFirst({
            where:{
                id:orderId,
                userId:userId,
                status:'OPEN'
            }
        })

        if(!closeOrderId){
            return res.status(404).json({error:"order not found"})
        }
        const payload={
            kind:'close-order',
            payload:{
                orderId,
                userId, //ownership is required
                closeReason:closeReason,
                closedAt: Date.now()
            }
        }
        // engineResponse: {
        //     id: 'da584058-431d-4173-81e2-949339658cb3',
        //     status: 'no_price',
        //     payload: '{"reason":"Price data not available for asset"}',
        //     reason: 'Price data not available for asset'
        // }
        const engineResponse=await engineDispatcher(orderId, payload, 5000)
        // const parseEngineResponse=JSON.parse(engineResponse.data)
        
        if(engineResponse.status=="closed"){
            return res.status(200).json({
                message:'order closed successfully',
                orderId,
                finalPnl: engineResponse.pnl
            })
        }
        return mapEngineResponse(res, engineResponse.status, orderId)
        // return res.status(409).json({error:'fail to close the order or timeout'})
    }catch(err){
        console.error(err)
        return res.status(500).json({error:'internal server error'})
    }
}