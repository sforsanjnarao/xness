import express, { Router } from 'express'
import { logoutController, profileController, signinController, signupController } from '../controllers/user.controller'
import { protectMiddleware } from '../middleware/protected'

const router:Router= express.Router()
router.post('/signup',signupController)
router.post('/signin',signinController)
router.get('/profile',protectMiddleware,profileController)
router.post('/signout',protectMiddleware,logoutController)


export default router