import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export const protectMiddleware=(req:Request, res:Response, next: NextFunction)=>{
    try{
        const token=req.cookies?.token //what cookie is undefine
        if(!token){
            return res.status(401).json({error:'unauthorized'})
        }
        const decode= jwt.verify(token,'sanjana') as JwtPayload

        req.user={id:decode.id}
        next()
    }catch(err){
        return res.status(500).json({err:"it's an error"})
    }
}