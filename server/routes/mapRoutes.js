import express from 'express';
import { optionalProtect } from '../middleware/authMiddleware.js';
import { getMapPins } from '../controllers/mapController.js';

const mapRouter = express.Router();

mapRouter.get('/pins', optionalProtect, getMapPins);

export default mapRouter;
