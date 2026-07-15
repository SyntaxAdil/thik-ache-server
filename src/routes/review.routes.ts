// routes/review.routes.ts
import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  createReview,
  getReviewsForUser,
  getReviewsByRequestId,
  getReviewsByUserId,
  getRecentReviews,
  getUserReviewStats,
  hasUserReviewed,
  getAllReviews,
} from "../controllers/review.controller.js";

const router = Router();


router.get("/recent", getRecentReviews);
router.get("/user/:userId", getReviewsByUserId);
router.get("/user/:userId/stats", getUserReviewStats);
router.get("/request/:requestId", getReviewsByRequestId);
router.get("/for-user/:userId", getReviewsForUser);
router.get("/all", getAllReviews); 


router.get("/request/:requestId/check", authMiddleware, hasUserReviewed);
router.post("/", authMiddleware, createReview);

export default router;