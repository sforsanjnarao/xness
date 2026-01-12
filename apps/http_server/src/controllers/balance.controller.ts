import { Request, Response } from "express"
import { redisClient } from "@repo/redis-client"
import { prisma } from "@repo/db"
import { engineDispatcher } from "../redis.client.engine"
import { v4 as uuidv4 } from 'uuid';
import {type Symbol, SYMBOL_DECIMALS,} from "@repo/types"
import { GetWalletBalanceBySymbol } from "../zod/balance.zod";





export const getBalance = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    try {
        const wallet = await prisma.wallet.findUnique({
            where: { userId: userId }
        });

        // If no wallet exists, it means balance is 0
        if (!wallet) {
            return res.status(200).json({ 
                balance: 0, 
                symbol: "USDC", 
                formatted: "0.00" 
            });
        }

        return res.status(200).json({ 
            balance: wallet.balanceRaw.toString(), 
            symbol: "USDC" 
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}


// export const getBalanceBySymbol = async (req: Request, res: Response) => {
//     const userId = req.user?.id

//     if (!userId) {
//         return res.status(401).json({
//             msg: "Unauthorized: user not found on request"
//         })
//     }

//     const validatedResult = GetWalletBalanceBySymbol.safeParse(req.params);

//     if (!validatedResult.success) {
//         return res.status(400).json({
//             error: "Invalid request parameters",
//             details: validatedResult.error
//         })
//     }

//     const { symbol } = validatedResult.data

//     try {
//         const wallet = await prisma.wallet.findUnique({
//             where: {
//                 userId_symbol: {
//                     userId,
//                     symbol
//                 }
//             },
//             select: {
//                 symbol: true,
//                 balanceRaw: true,
//                 balanceDecimal: true
//             },
//         });

//         if (!wallet) {
//             return res.status(404).json({
//                 error: "wallet not found"
//             })
//         }

//         return res.json({message:'got the balance',wallet})
//     } catch (error) {
//         return res.status(400).json({
//             msg: "Failed to fetch wallet balances for assets",
//             error
//         })
//     }
// }

export const depositWallet = async (req: Request, res: Response) => {
    const userId = req.user?.id

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" })
    }
    const {  amount } = req.body

    if (amount <= 0) {
        return res.status(400).json({ error: "Amount must be positive" })
    }
    let decimalPlaces=6
    const baseUnitAmount = BigInt(Math.round(amount * Math.pow(10, decimalPlaces)))

    if (baseUnitAmount <= 0n) {
        return res.status(400).json({ error: "invalid amount (too small)" })
    }

    try {
      // 1. DATABASE WRITE
        const updatedWallet = await prisma.wallet.upsert({
            where: {
                userId: userId, // No need for compound key anymore
            },
            create: {
                userId,
                balanceRaw: baseUnitAmount,
            },
            update: {
                balanceRaw: { increment: baseUnitAmount },
            },
        });


        // 2. GENERATE TRACE ID
        const depositId = uuidv4(); 

        try {
         const payload={
            kind: "balance-update",
            payload: {
                depositId,
                userId,
                asset:'USDC',
                balanceRaw: updatedWallet.balanceRaw, 
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




