import express, { Router } from 'express'
import { logoutController, profileController, signinController, signupController } from '../controllers/user.controller'

const router:Router= express.Router()
router.post('/signup',signupController)
router.post('/signin',signinController)
router.get('/profile',profileController,profileController)
router.post('/signout',profileController,logoutController)


export default router