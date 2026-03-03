import express from "express";
import { 
    createViewingRequest, 
    createDirectApply,
    respondToViewingRequest, 
    getUserViewingRequests,
    markViewingCompleted,
    getOwnerViewingRequests,
    handleNudgeResponse,
    handleOwnerAction,
    handleRenterDecision
} from "../controllers/viewingController.js";
import { protect } from "../middleware/authMiddleware.js";

const viewingRouter = express.Router();

viewingRouter.post("/create", protect, createViewingRequest);
viewingRouter.post("/direct-apply", protect, createDirectApply);
viewingRouter.post("/respond", protect, respondToViewingRequest);
viewingRouter.get("/user-requests", protect, getUserViewingRequests);
viewingRouter.get("/owner", protect, getOwnerViewingRequests);
viewingRouter.post("/mark-completed", protect, markViewingCompleted);
viewingRouter.get("/nudge-response", handleNudgeResponse);           // token-based, no auth
viewingRouter.get("/owner-action", handleOwnerAction);               // token-based, no auth
viewingRouter.post("/:id/renter-decision", protect, handleRenterDecision); // authenticated

export default viewingRouter;
