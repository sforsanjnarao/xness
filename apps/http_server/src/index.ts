import express from 'express'
import  cookieParser from 'cookie-parser'
import authRoute from './routes/user.routes'
import orderRoute from './routes/order.routes'
import balanceRoute from './routes/balance.route'
import candleRoute from './routes/candles.route'
import cros from 'cors'


import "../utils/biginit-json";
import { protectMiddleware } from './middleware/protected'
const app=express()
app.use(cros({
    origin:'http://localhost:3001',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true 
}))
// console.log(app.use(protectMiddleware))
// import { startRedisListener } from "./redis.client.engine";

// startRedisListener();
app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use(cookieParser())

app.use('/v1/auth',authRoute)
app.use('/v1/orders',orderRoute)
app.use('/v1/balance', balanceRoute)
app.use('/v1/candles',candleRoute)



app.listen(8001,()=>{
    console.log('port is listening on 8080')
})