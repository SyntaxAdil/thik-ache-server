// routes/user.routes.ts
import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { 
  getUserProfile, 
  getMyActivity,
  getAllUsers,
  deleteUser,
  updateUserRole
} from "../controllers/user.controller.js";

const router = Router();

router.get("/me/activity", authMiddleware, getMyActivity);
router.get("/:id", getUserProfile);
router.get("/", authMiddleware, getAllUsers);
router.delete("/:id", authMiddleware, deleteUser);
router.patch("/:id/role", authMiddleware, updateUserRole);

export default router;