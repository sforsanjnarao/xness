import { Request, Response } from "express";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

interface userType{
 id:string,
 name:string,
 email:string,
 password:string
}
const User:userType[]=[]
export const signupController=async (req:Request, res:Response)=>{

    try{
        const {name, email, password} =req.body
        if(!name || !email || !password){
            res.status(409).json({error:'field is missing'})    //409 for conflict
        }

        const existingUser=User.find(u=>u.email===email)
        if(existingUser){
            return res.status(400).json({error: 'user already exist'})
        }
        const hashPassword= await bcrypt.hash(password,10)

        const user={
            id:crypto.randomUUID(),  //this can collide
            name:name,
            email:email,
            password:hashPassword
        }
        User.push(user)

        const token= jwt.sign({userId:user.id},'sanjana')     //payload must be an object

        res.cookie('token', token,{  
            httpOnly:true,       //need more security
            secure:true
        })

        res.status(200).json({message:'welcome in', user:{userId:user.id, name:user.name, email:user.email}})  //can't send token in the response
    }catch(err){
        res.status(500).json({error: 'something got wrong'})
    }
}


export const signinController=async (req:Request, res:Response)=>{
    try{
        const {email, password}=req.body

        const existingUser=User.find(u=>u.email===email)
        //404 user not found
            if(!existingUser) return res.status(404).json({error:'u r not in the database, register your self first'}) 

        const passwordPassed=await bcrypt.compare(password, existingUser.password)
            if(!passwordPassed){
                //401 wrong password
                return res.status(401).json({error:'wrong credentials'})
            }
        const token=jwt.sign({userId:existingUser.id},'sanjana')
        res.cookie('token',token,{
            httpOnly:true,
            secure:true
        })
        return res.status(200).json({message:'u r success full signedUp', user:{userId:existingUser.id, email: existingUser.email}})
    }catch(err){
        return res.status(500).json({error:'something went wrong'})
    }
}


export const profileController=async (req:Request, res:Response)=>{
    try{
        const userId= req.user?.id
        if(!userId){
            return res.status(401).json({error:'user unauthincated'}) //401 ---> unauthincated
        }     
        const user=User.find(u=>u.id==userId)
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