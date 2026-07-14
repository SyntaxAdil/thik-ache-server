import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { getUserProfile, getMyActivity } from "../controllers/user.controller.js";

const router = Router();

router.get("/me/activity", authMiddleware, getMyActivity);
router.get("/:id", getUserProfile);

export default router;