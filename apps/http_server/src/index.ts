import express from 'express'
import cookieParser from 'cookie-parser'
import authRoute from './routes/user.routes'
import orderRoute from './routes/order.routes'
import balanceRoute from './routes/balance.route'
import candleRoute from './routes/candles.route'
import cros from 'cors'


import "../utils/biginit-json";
const app = express()
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
    console.log(`port is listening on ${PORT}`)
})