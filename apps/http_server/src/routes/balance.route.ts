import express, { Router } from 'express'
import { getBalance } from '../controllers/balance.controller'

const router:Router=express.Router()

router.get('/')
router.get('/:symbol')
router.post('/deposit')


export default router