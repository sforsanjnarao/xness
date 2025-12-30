import express, { Router } from 'express'
import { closeOrder, createOrder, getOrder, getOrderById } from '../controllers/order.controller'

const router:Router=express.Router()

router.get('/',getOrder)
router.post('/',createOrder)
router.get('/:orderId',getOrderById)
router.post('/:orderId/close', closeOrder)


export default router