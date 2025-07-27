import express from 'express'
import * as exerciseController from '../controllers/exerciseController.js'
import authMiddleware from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes in this file are protected
router.use(authMiddleware)

router.route('/').get(exerciseController.getAllExercises).post(exerciseController.addExercise)

router.route('/:id').delete(exerciseController.deleteExercise)

export default router

