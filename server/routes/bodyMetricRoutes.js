import express from 'express'
import * as bodyMetricController from '../controllers/bodyMetricController.js'
import authMiddleware from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes in this file are protected
router.use(authMiddleware)

router.route('/').get(bodyMetricController.getAllRecords).post(bodyMetricController.addOrUpdateRecord)

router.route('/:id').delete(bodyMetricController.deleteRecord)

export default router
