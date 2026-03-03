import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { subscribePush, unsubscribePush, getVapidPublicKey } from "../controllers/notificationController.js";

const notificationRouter = express.Router();

// Public — get VAPID key so client can subscribe
notificationRouter.get('/vapid-public-key', getVapidPublicKey);

// Protected — subscribe/unsubscribe push
notificationRouter.post('/subscribe', protect, subscribePush);
notificationRouter.post('/unsubscribe', protect, unsubscribePush);

export default notificationRouter;
