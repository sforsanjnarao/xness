import { Request, Response } from "express"
import { redisClient } from "@repo/redis-client"
import { prisma } from "@repo/db"
import { engineDispatcher } from "../redis.client.engine"
import { v4 as uuidv4 } from 'uuid';
import {type Symbol, SYMBOL_DECIMALS,} from "@repo/types"
import { GetWalletBalanceBySymbol } from "../zod/balance.zod";


enum walletSymbol{
    SOL_USDC="SOL_USDC",
    ETH_USDC="ETH_USDC",
    BTC_USDC="BTC_USDC"
}

type wallet={
    id: string
    userId: string
    symbol:walletSymbol
    balanceRaw:bigint       //bigInt Means floating
    balanceDecimal:number
    createdAt:Date
    updatedAt:Date
}
const publishToRedis=redisClient()

const balance:wallet[]=[]
 export const getBalance=async (req:Request, res:Response)=>{
 //get the userId 
 // with the help of userId find the balance of the user
 //one user can have multiple wallet
 //return the balance 
 try{
    const userId= req.user?.id
        if(!userId){
            return res.status(401).json({error:' unauthenticated'})
        }
    //     //we get all The wallet that belong to that user
    //   const userAllWallet=balance.filter(w=>w.userId==userId)
    //   if(userAllWallet.length==0){
    //     return res.status(404).json({error:'user wallet not found'})
    //   }
         
        let userAllWallet= await prisma.wallet.findMany({
            where: {
                userId: userId
            }

        })
        if(!userAllWallet){
            return res.status(404).json({error:'wallet not found'})
        }
      
      // now we need to that to the user in the formatted way
    return res.status(200).json({message:'successfully found the user balance', userAllWallet})
 }catch(err){
    console.error(err)
    return res.status(500).json({error:'internal server error'})
 }
}


export const getBalanceBySymbol = async (req: Request, res: Response) => {
    const userId = req.user?.id

    if (!userId) {
        return res.status(401).json({
            msg: "Unauthorized: user not found on request"
        })
    }

    const validatedResult = GetWalletBalanceBySymbol.safeParse(req.params);

    if (!validatedResult.success) {
        return res.status(400).json({
            error: "Invalid request parameters",
            details: validatedResult.error
        })
    }

    const { symbol } = validatedResult.data

    try {
        const wallet = await prisma.wallet.findUnique({
            where: {
                userId_symbol: {
                    userId,
                    symbol
                }
            },
            select: {
                symbol: true,
                balanceRaw: true,
                balanceDecimal: true
            },
        });

        if (!wallet) {
            return res.status(404).json({
                error: "wallet not found"
            })
        }

        return res.json({message:'got the balance',wallet})
    } catch (error) {
        return res.status(400).json({
            msg: "Failed to fetch wallet balances for assets",
            error
        })
    }
}






export const depositWallet = async (req: Request, res: Response) => {
    const userId = req.user?.id

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" })
    }

   
    const { symbol, amount } = req.body

    const decimalPlaces = SYMBOL_DECIMALS[symbol as Symbol];

    if (decimalPlaces === undefined) {
        return res.status(400).json({ 
            error: `Symbol ${symbol} is not supported or configured.` 
        })
    }

    if (amount <= 0) {
        return res.status(400).json({ error: "Amount must be positive" })
    }

    const baseUnitAmount = BigInt(Math.round(amount * Math.pow(10, decimalPlaces)))

    if (baseUnitAmount <= 0n) {
        return res.status(400).json({ error: "invalid amount (too small)" })
    }

    try {
      // 1. DATABASE WRITE
        const updatedWallet = await prisma.wallet.upsert({
            where: {
                userId_symbol: {
                    userId,
                    symbol,
                }
            },
            create: {
                userId,
                symbol,
                balanceRaw: baseUnitAmount, //store as bigInt
                balanceDecimal: decimalPlaces 
            },
            update: {
                balanceRaw: { increment: baseUnitAmount },
            },
            select: {
                symbol: true,
                balanceRaw: true,
                balanceDecimal: true
            }
        })

        // 2. GENERATE TRACE ID
        const depositId = uuidv4(); 

        try {
         const payload={
            kind: "balance-update",
            payload: {
                depositId,
                userId,
                symbol: updatedWallet.symbol,
                balanceRaw: updatedWallet.balanceRaw, 
                balanceDecimal: updatedWallet.balanceDecimal
            }
         }
         //3. SEND TO ENGINE AND AWAIT RESPONSE
           let engineResponse= await engineDispatcher(depositId,payload,5000)

           console.log('engineResponse',engineResponse)
               if(engineResponse.status==='balance_updated'){
               return res.status(201).json({message:'your order is created', engineResponse, depositId})
             }
        } catch (error) {
            console.error("Failed to publish balance update:", error)
        }
    } catch (err) {
        console.error("depositToWallet:", err)
        return res.status(500).json({ error: "Failed to process deposit" })
    }
}




// export const depositToWallet=(req:Request, res:Response)=>{
//    try{
//        //1: add to the db 
//       //2: send it to the engine from stream

//       //1.1: get data from the user 
//       const userId= req.user?.id

//       const {amount, symbol}= req.body


//       //validate the input 
//       if(amount<=0){
//          return res.status(409).json({error:'need a positive value'})
//       }
      
//       //1.2: find the wallet
//       const walletIndex=balance.findIndex(w=>w.userId===userId && w.symbol==symbol)
//       if(walletIndex==-1){
//          return res.status(404).json({error:'index not found'})
//       }
//       let depositWallet=balance[walletIndex]
//       if(!depositWallet){
//          return res.status(404).json({error:'wallet not found'})
//       }
//       //we are not taking symbol from the users
//       const walletDecimal=SYMBOL_DECIMALS[symbol as Symbol]
//       let calRawBalance=BigInt(Math.round(amount*Math.pow(10,walletDecimal)))
//       //we want update specific part of that exist object 
//       //find index -> build new object -> replace only that index
//       const updateWallet={
//          ...depositWallet,
//          balanceRaw:depositWallet.balanceRaw+calRawBalance,
//          updatedAt: new Date()
//       }

//       balance[walletIndex]= updateWallet
//       try{
//             publishToRedis.xadd(
//                'trading-engine',
//                "*",
//                "data",
//                JSON.stringify({
//                   kind:'update-balance',
//                   payload:{
//                      id:depositWallet.id,
//                      userId:depositWallet.userId,
//                      symbol:symbol,
//                      balanceRaw:updateWallet.balanceRaw,
//                      balanceDecimal:walletDecimal,
//                      updatedAt: updateWallet.updatedAt
//                   }
//                })
//             )
//       }catch(err){
//          console.error(err)
//          return res.status(500).json({error:'internal server error'})
//       }
//       return res.status(201).json({message:'deposit successfully created'})
//    }catch(err){
//          console.error(err)
//          return res.status(500).json({error:'internal server error'})
//       }

    
// }