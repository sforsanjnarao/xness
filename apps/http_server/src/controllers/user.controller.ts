import { Request, Response } from "express";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import {prisma} from '@repo/db'

// interface userType{
//  id:string,
//  name:string,
//  email:string,
//  password:string
// }
// const User:userType[]=[]
export const signupController=async (req:Request, res:Response)=>{

    try{
        const {name, email, password} =req.body
        if(!name || !email || !password){
           return res.status(409).json({error:'field is missing'})    //409 for conflict
        }

        const existingUser=await prisma.user.findFirst({
            where:{
                email:email
            }
        })
        if(existingUser){
            return res.status(400).json({error: 'user already exist'})
        }
        const hashPassword= await bcrypt.hash(password,10)

        
        const user=await prisma.user.create({
            data:{
                name:name,
                email:email,
                password:hashPassword
            }
        })
            // create default wallets
            // await prisma.wallet.createMany({
            // data: [
            //     { userId: user.id, symbol: "USDC", balanceRaw: BigInt(0), balanceDecimal: 6 },
            //     // { userId: user.id, symbol: "BTC",  balanceRaw: BigInt(0), balanceDecimal: 8 },
            //     // { userId: user.id, symbol: "ETH",  balanceRaw: BigInt(0), balanceDecimal: 8 }
            // ]
            // });
        const token= jwt.sign({userId:user.id},'sanjana')     //payload must be an object
        res.cookie('token', token,{  
                secure: process.env.NODE_ENV === "false", 
                sameSite: 'lax', // Helps with localhost cookie behavior
                maxAge: 24 * 60 * 60 * 1000 // Optional: 1 day expiry

        })

        res.status(200).json({message:'welcome in', user:{userId:user.id, name:user.name, email:user.email}})  //can't send token in the response
    }catch(err){
        console.error("SIGNUP ERROR:", err); 
        res.status(500).json({error: 'something got wrong'})
    }
}


export const signinController=async (req:Request, res:Response)=>{
    try{
        const {email, password}=req.body
        if(!email || !password){
            return res.status(404).json({error:'field is missing'})
        }

        const existingUser=await prisma.user.findFirst({
            where:{
                email:email
            }
        })
        //404 user not found
            if(!existingUser) return res.status(404).json({error:'u r not in the database, register your self first'}) 

            const passwordPassed=await bcrypt.compare(password, existingUser.password)
            if(!passwordPassed){
                //401 wrong password
                return res.status(401).json({error:'wrong credentials'})
            }
        const token=jwt.sign({userId:existingUser.id},'sanjana')
        res.cookie('token',token,{
                secure: process.env.NODE_ENV === 'false', 
                sameSite: 'lax', // Helps with localhost cookie behavior
                maxAge: 24 * 60 * 60 * 1000 // Optional: 1 day expiry

        })
        return res.status(200).json({message:'u r success full signedUp', user:{userId:existingUser.id, email: existingUser.email}})
    }catch(err){
        return res.status(500).json({error:'something went wrong'})
    }
}


export const profileController=async (req:Request, res:Response)=>{
    try{
        const userId= req.user?.id
        console.log('userId:',userId)
        if(!userId){
            return res.status(401).json({error:'user unauthincated'}) //401 ---> unauthincated
        }     
        const user=await prisma.user.findUnique({
            where:{
                id:userId
            }
        })
        if(!user){
            return res.status(404).json({error:"user not found"}) //404 --> means user snot found
        }
        return res.status(200).json({user:{userId:userId,name:user.name, email:user.email}})   
    }catch(err){
        return res.status(500).json({error:'internal server error'})
    }
}

export const logoutController=(req:Request, res:Response)=>{
    try{
        res.clearCookie('token',{
            httpOnly:true,
            secure:true,
            sameSite:"none",
            path:"/"
        })
        return res.status(200).json({message:'you log-out successfully'})
    }catch(error){
        return res.status(500).json({error:'internal server error'})
    }
}