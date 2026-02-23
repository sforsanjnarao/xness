import { Request, Response } from "express";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '@repo/db'
import logger from '../logger'

const JWT_SECRET = process.env.JWT_SECRET || 'sanjana'

const getIp = (req: Request): string => {
    const forwarded = req.headers['x-forwarded-for']
    if (typeof forwarded === 'string') return (forwarded.split(',')[0] ?? '').trim()
    return req.socket?.remoteAddress || 'unknown'
}

export const signupController = async (req: Request, res: Response) => {
    const ip = getIp(req)
    try {
        const { name, email, password } = req.body
        if (!name || !email || !password) {
            logger.warn({ ip, email }, 'Signup failed: missing fields')
            return res.status(409).json({ error: 'field is missing' })
        }

        const existingUser = await prisma.user.findFirst({ where: { email } })
        if (existingUser) {
            logger.warn({ ip, email }, 'Signup failed: user already exists')
            return res.status(400).json({ error: 'user already exist' })
        }

        const hashPassword = await bcrypt.hash(password, 10)
        const user = await prisma.user.create({
            data: { name, email, password: hashPassword }
        })

        const token = jwt.sign({ userId: user.id }, JWT_SECRET)
        res.cookie('token', token, {
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000
        })

        logger.info({ ip, email, userId: user.id }, 'User signed up successfully')
        res.status(200).json({ message: 'welcome in', user: { userId: user.id, name: user.name, email: user.email } })
    } catch (err) {
        logger.error({ ip, err }, 'Signup error')
        res.status(500).json({ error: 'something got wrong' })
    }
}


export const signinController = async (req: Request, res: Response) => {
    const ip = getIp(req)
    try {
        const { email, password } = req.body
        if (!email || !password) {
            logger.warn({ ip }, 'Signin failed: missing fields')
            return res.status(404).json({ error: 'field is missing' })
        }

        const existingUser = await prisma.user.findFirst({ where: { email } })
        if (!existingUser) {
            logger.warn({ ip, email }, 'Signin failed: user not found')
            return res.status(404).json({ error: 'u r not in the database, register your self first' })
        }

        const passwordPassed = await bcrypt.compare(password, existingUser.password)
        if (!passwordPassed) {
            logger.warn({ ip, email }, '🚨 Signin failed: wrong password')
            return res.status(401).json({ error: 'wrong credentials' })
        }

        const token = jwt.sign({ userId: existingUser.id }, JWT_SECRET)
        res.cookie('token', token, {
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000
        })

        logger.info({ ip, email, userId: existingUser.id }, '✅ User signed in')
        return res.status(200).json({ message: 'u r success full signedUp', user: { userId: existingUser.id, email: existingUser.email } })
    } catch (err) {
        logger.error({ ip, err }, 'Signin error')
        return res.status(500).json({ error: 'something went wrong' })
    }
}


export const profileController = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id
        if (!userId) {
            return res.status(401).json({ error: 'user unauthincated' })
        }
        const user = await prisma.user.findUnique({ where: { id: userId } })
        if (!user) {
            return res.status(404).json({ error: "user not found" })
        }
        return res.status(200).json({ user: { userId, name: user.name, email: user.email } })
    } catch (err) {
        logger.error({ err }, 'Profile fetch error')
        return res.status(500).json({ error: 'internal server error' })
    }
}

export const logoutController = (req: Request, res: Response) => {
    const ip = getIp(req)
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            path: "/"
        })
        logger.info({ ip, userId: req.user?.id }, 'User logged out')
        return res.status(200).json({ message: 'you log-out successfully' })
    } catch (error) {
        logger.error({ ip, error }, 'Logout error')
        return res.status(500).json({ error: 'internal server error' })
    }
}