import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { createReview, getReviewsForUser } from "../controllers/review.controller.js";

const router = Router();

router.post("/", authMiddleware, createReview);
router.get("/user/:userId", getReviewsForUser);

export default router;