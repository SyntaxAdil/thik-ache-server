import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  createHelpRequest,
  getHelpRequests,
  getHelpRequestById,
  getRelatedHelpRequests,
  acceptHelpRequest,
  markInProgress,
  markComplete,
  cancelHelpRequest,
  deleteHelpRequest,
  getMyPostedRequests,
  getMyHelpingRequests,
} from "../controllers/help-request.controller.js";

const router = Router();

router.get("/", getHelpRequests);
router.get("/mine/posted", authMiddleware, getMyPostedRequests);
router.get("/mine/helping", authMiddleware, getMyHelpingRequests);
router.get("/:id", getHelpRequestById);
router.get("/:id/related", getRelatedHelpRequests);

router.post("/", authMiddleware, createHelpRequest);
router.patch("/:id/accept", authMiddleware, acceptHelpRequest);
router.patch("/:id/in-progress", authMiddleware, markInProgress);
router.patch("/:id/complete", authMiddleware, markComplete);
router.patch("/:id/cancel", authMiddleware, cancelHelpRequest);
router.delete("/:id", authMiddleware, deleteHelpRequest);

export default router;