import { Request, Response } from "express"
import { redisClient } from "@repo/redis-client"

enum walletSymbol{
    SOL_USDC="SOL_USDC",
    ETH_USDC="ETH_USDC",
    BTC_USDC="BTC_USDC"
}
const SYMBOL_DECIMALS={
   BTC_USDC:8,
   ETH_USDC:18,
   SOL_USDC:9
} as const

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
export const getBalance=(req:Request, res:Response)=>{
 //get the userId 
 // with the help of userId find the balance of the user
 //one user can have multiple wallet
 //return the balance 
 try{
    const userId= req.user?.id
        if(!userId){
            return res.status(401).json({error:' unauthenticated'})
        }
        //we get all The wallet that belong to that user
      const userAllWallet=balance.filter(w=>w.userId==userId)
      if(userAllWallet.length==0){
        return res.status(404).json({error:'user wallet not found'})
      }
      
      // now we need to that to the user in the formatted way
      const formatted=userAllWallet.map((w)=>({
            // const totalBalance= w.balanceRaw/10**w.balanceDecimal
            Symbol:w.symbol,
            totalBalance:Number(w.balanceRaw)/Math.pow(10,w.balanceDecimal)
        }))
    return res.status(200).json({message:'successfully found the user balance', formatted})
 }catch(err){
    console.error(err)
    return res.status(500).json({error:'internal server error'})
 }
}


export const getBalanceBySymbol=(req:Request, res:Response)=>{
 const userId= req.user?.id
 if(!userId){
    return res.status(401).json({error:'unauthenticated'})
 }
 const {symbol} =req.params
 if(!symbol){
    return res.status(400).json({error:'symbol is require'})
 }
 let balBySymbol=balance.find(bal=>bal.userId==userId && bal.symbol==symbol)
 if(!balBySymbol){
    return res.status(404).json({error:'no wallet found'})
 }
 const formatted={
    userId:balBySymbol.userId,
    symbol:balBySymbol.symbol,
    balance:Number(balBySymbol.balanceRaw)/10**balBySymbol.balanceDecimal
 }
 return res.status(200).json({message:'got your balance', formatted})
}


export const depositToWallet=(req:Request, res:Response)=>{
   try{
       //1: add to the db 
      //2: send it to the engine from stream

      //1.1: get data from the user 
      const userId= req.user?.id

      const {amount, symbol}= req.body
      //validate the input 
      if(amount<0){
         return res.status(409).json({error:'need a positive value'})
      }
      //1.2: find the wallet
      const walletIndex=balance.findIndex(w=>w.userId===userId && w.symbol==symbol)
      if(walletIndex==-1){
         return res.status(404).json({error:'index not found'})
      }
      let depositWallet=balance[walletIndex]
      if(!depositWallet){
         return res.status(404).json({error:'wallet not found'})
      }
      //we are not taking symbol from the users
      const walletDecimal=SYMBOL_DECIMALS[symbol as walletSymbol]
      let calRawBalance=BigInt(Math.round(amount*Math.pow(10,walletDecimal)))
      //we want update specific part of that exist object 
      //find index -> build new object -> replace only that index
      const updateWallet={
         ...depositWallet,
         balanceRaw:depositWallet.balanceRaw+calRawBalance,
         updatedAt: new Date()
      }
      balance[walletIndex]= updateWallet
      try{
            publishToRedis.xadd(
               'trading-engine',
               "*",
               "data",
               JSON.stringify({
                  kind:'update-balance',
                  payload:{
                     id:depositWallet.id,
                     userId:depositWallet.userId,
                     symbol:symbol,
                     balanceRaw:updateWallet.balanceRaw,
                     balanceDecimal:walletDecimal,
                     updatedAt: updateWallet.updatedAt
                  }
               })
            )
      }catch(err){
         console.error(err)
         return res.status(500).json({error:'internal server error'})
      }
      return res.status(201).json({message:'deposit successfully created'})
   }catch(err){
         console.error(err)
         return res.status(500).json({error:'internal server error'})
      }

    
}
