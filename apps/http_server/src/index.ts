import express from 'express'
import cookieParser from 'cookie-parser'
import authRoute from './routes/user.routes'
import orderRoute from './routes/order.routes'
import balanceRoute from './routes/balance.route'
import candleRoute from './routes/candles.route'
import cros from 'cors'
import pinoHttp from 'pino-http'
import logger from './logger'

import "../utils/biginit-json";
const app = express()

app.use(pinoHttp({
    logger,
    customSuccessMessage: (req, res) => {
        return `${req.method} ${req.url} completed`
    },
    customErrorMessage: (req, res, err) => {
        return `${req.method} ${req.url} failed: ${err.message}`
    },
    customAttributeKeys: {
        req: 'request',
        res: 'response',
    },
    serializers: {
        req(req) {
            return {
                method: req.method,
                url: req.url,
                ip: req.headers['x-forwarded-for'] || req.remoteAddress,
            }
        },
        res(res) {
            return { statusCode: res.statusCode }
        },
    },
}))

app.use(cros({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(cookieParser())

app.use('/v1/auth', authRoute)
app.use('/v1/orders', orderRoute)
app.use('/v1/balance', balanceRoute)
app.use('/v1/candles', candleRoute)



const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    logger.info(`🚀 Server started on port ${PORT}`)
})