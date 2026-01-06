import express, { Router } from 'express'
import { depositToWallet, getBalance, getBalanceBySymbol } from '../controllers/balance.controller'

const router:Router=express.Router()

router.get('/',getBalance)
router.get('/:symbol',getBalanceBySymbol)
router.post('/deposit',depositToWallet)


export default router