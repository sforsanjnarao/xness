import express from 'express'
import  cookieParser from 'cookie-parser'
const app=express()

app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use(cookieParser())

app.use('/v1/auth',)


app.listen(3000,()=>{
    console.log('port is listening on 3000')
})