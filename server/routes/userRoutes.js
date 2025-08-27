import express from 'express'
import * as userController from '../controllers/userController.js'
import authMiddleware from '../middleware/authMiddleware.js'

const router = express.Router()

router.post('/register', userController.register)
router.post('/login', userController.login)
router.post('/google', userController.googleLogin)

// Protect all routes after this middleware
router.use(authMiddleware)

router.get('/me', userController.getMe)

export default router
