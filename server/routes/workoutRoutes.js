import express from 'express'
import * as workoutController from '../controllers/workoutController.js'
import authMiddleware from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes in this file are protected
router.use(authMiddleware)

router.route('/').get(workoutController.getPaginatedWorkouts).post(workoutController.addWorkout)

router.route('/all').get(workoutController.getAllWorkouts)

router.route('/:id').delete(workoutController.deleteWorkout)

export default router
