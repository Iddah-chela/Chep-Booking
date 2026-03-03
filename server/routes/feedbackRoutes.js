import express from "express";
import { 
  submitFeedback, 
  getAllFeedback, 
  updateFeedbackStatus, 
  deleteFeedback 
} from "../controllers/feedbackController.js";
import { protect } from "../middleware/authMiddleware.js";

const feedbackRouter = express.Router();

feedbackRouter.post("/submit", protect, submitFeedback);
feedbackRouter.get("/all", protect, getAllFeedback);
feedbackRouter.post("/update-status", protect, updateFeedbackStatus);
feedbackRouter.delete("/:feedbackId", protect, deleteFeedback);

export default feedbackRouter;
