import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import logger from '../logger';

const JWT_SECRET = process.env.JWT_SECRET || 'sanjana'

export const protectMiddleware = (req: Request, res: Response, next: NextFunction) => {

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || req.socket?.remoteAddress
        || 'unknown'

    try {
        const token = req.cookies?.token
        if (!token) {
            logger.warn({ ip, url: req.url }, 'Auth failed: no token provided')
            return res.status(401).json({ error: 'unauthorized' })
        }

        const decode = jwt.verify(token, JWT_SECRET) as JwtPayload
        req.user = { id: decode.userId }

        next()
    } catch (err: any) {
        logger.warn({ ip, url: req.url, reason: err?.message }, '🚨 Auth failed: invalid or expired token')
        return res.status(401).json({ err: "unauthorized" })
    }
}