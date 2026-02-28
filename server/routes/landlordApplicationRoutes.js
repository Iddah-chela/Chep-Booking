import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';
import {
    instantSignup,
    submitApplication,
    getMyApplication,
    getAllApplications,
    approveApplication,
    rejectApplication
} from '../controllers/landlordApplicationController.js';

const router = express.Router();

// User routes
router.post('/instant-signup', protect, instantSignup);
router.post('/submit', protect, submitApplication);
router.get('/my-application', protect, getMyApplication);

// Admin routes
router.get('/all', protect, requireAdmin, getAllApplications);
router.put('/approve/:applicationId', protect, requireAdmin, approveApplication);
router.put('/reject/:applicationId', protect, requireAdmin, rejectApplication);

export default router;
