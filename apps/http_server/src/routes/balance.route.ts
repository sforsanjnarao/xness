import express, { Router } from 'express'
import { depositWallet, getBalance } from '../controllers/balance.controller'
import { protectMiddleware } from '../middleware/protected'

const router:Router=express.Router()

router.get('/',protectMiddleware,getBalance)
// router.get('/:symbol',protectMiddleware,getBalanceBySymbol)
router.post('/deposit',protectMiddleware,depositWallet)


export default router