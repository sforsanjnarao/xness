import express, { Router } from 'express'
import { closeOrder, createOrder, getOrder, getOrderById } from '../controllers/order.controller'
import { protectMiddleware } from '../middleware/protected'

const router:Router=express.Router()

router.get('/',protectMiddleware,getOrder)
router.post('/',protectMiddleware,createOrder)
router.get('/:orderId',protectMiddleware,getOrderById)
router.post('/:orderId/close',protectMiddleware, closeOrder)


export default router