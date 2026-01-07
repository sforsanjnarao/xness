import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export const protectMiddleware=(req:Request, res:Response, next: NextFunction)=>{
    try{
        const token=req.cookies?.token //what cookie is undefine
        console.log('token:',token)
        if(!token){
            return res.status(401).json({error:'unauthorized'})
        }
        const decode= jwt.verify(token,'sanjana') as JwtPayload
        console.log("decode:",decode)

        req.user={id:decode.userId}
        console.log("req.user:",req.user)
        next()
    }catch(err){
        return res.status(500).json({err:"it's an error"})
    }
}