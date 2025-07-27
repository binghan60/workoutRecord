import express from 'express'
import * as scheduleController from '../controllers/scheduleController.js'
import authMiddleware from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes in this file are protected
router.use(authMiddleware)

router.route('/').get(scheduleController.getSchedule).put(scheduleController.updateSchedule)

export default router
