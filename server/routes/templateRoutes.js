import express from 'express'
import * as templateController from '../controllers/templateController.js'
import authMiddleware from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes in this file are protected
router.use(authMiddleware)

router.route('/').get(templateController.getAllTemplates).post(templateController.addTemplate)

router.route('/:id').put(templateController.updateTemplate).delete(templateController.deleteTemplate)

export default router
