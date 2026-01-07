import express from 'express'
import  cookieParser from 'cookie-parser'
import authRoute from './routes/user.routes'
import orderRoute from './routes/order.routes'
import balanceRoute from './routes/balance.route'

import "../utils/biginit-json";
const app=express()

app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use(cookieParser())

app.use('/v1/auth',authRoute)
app.use('/v1/orders',orderRoute)
app.use('/v1/balance', balanceRoute)



app.listen(3000,()=>{
    console.log('port is listening on 3000')
})