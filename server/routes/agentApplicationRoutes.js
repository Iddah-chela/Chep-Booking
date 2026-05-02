import express from 'express';
import * as agentAppController from '../controllers/agentApplicationController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';

const router = express.Router();

// User routes
router.post('/apply', protect, agentAppController.submitAgentApplication);
router.get('/my-status', protect, agentAppController.getMyApplicationStatus);

// Admin routes
router.get('/', protect, requireAdmin, agentAppController.getAgentApplications);
router.put('/:applicationId/approve', protect, requireAdmin, agentAppController.approveAgentApplication);
router.put('/:applicationId/reject', protect, requireAdmin, agentAppController.rejectAgentApplication);

export default router;
