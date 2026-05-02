import express from 'express';
import * as agentController from '../controllers/agentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Middleware to check agent role
const isAgent = requireRole('agent');

// ===== VACANCY ROUTES =====

// Agent: Create a new vacancy
router.post('/vacancies', protect, isAgent, agentController.postVacancy);

// Agent: Get all their vacancies
router.get('/vacancies', protect, isAgent, agentController.getAgentVacancies);

// Public: Get single vacancy by ID (anyone can view)
router.get('/vacancies/:id', agentController.getVacancyById);

// Agent: Update vacancy
router.put('/vacancies/:id', protect, isAgent, agentController.updateVacancy);

// Agent: Deactivate vacancy
router.delete('/vacancies/:id', protect, isAgent, agentController.deleteVacancy);

// ===== LEAD ROUTES =====

// Agent: Get all their leads
router.get('/leads', protect, isAgent, agentController.getAgentLeads);

// Agent: Get single lead
router.get('/leads/:id', protect, isAgent, agentController.getLeadById);

// Agent: Update lead (status, notes, contact method)
router.put('/leads/:id', protect, isAgent, agentController.updateLead);

// Agent: Mark lead outcome (viewed, booked, not-fit, no-response)
router.put('/leads/:id/outcome', protect, isAgent, agentController.markLeadOutcome);

// Authenticated user: Express interest in a vacancy (create lead)
router.post('/leads', protect, agentController.createLead);

// ===== STATS ROUTES =====

// Agent: Get dashboard stats
router.get('/stats', protect, isAgent, agentController.getAgentStats);

export default router;
