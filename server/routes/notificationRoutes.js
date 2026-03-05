import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { subscribePush, unsubscribePush, getVapidPublicKey, getMyNotifications, markNotificationsRead } from "../controllers/notificationController.js";

const notificationRouter = express.Router();

// Public — get VAPID key so client can subscribe
notificationRouter.get('/vapid-public-key', getVapidPublicKey);

// Protected — push subscribe/unsubscribe
notificationRouter.post('/subscribe', protect, subscribePush);
notificationRouter.post('/unsubscribe', protect, unsubscribePush);

// Protected — in-app notifications
notificationRouter.get('/my', protect, getMyNotifications);
notificationRouter.post('/mark-read', protect, markNotificationsRead);

export default notificationRouter;
