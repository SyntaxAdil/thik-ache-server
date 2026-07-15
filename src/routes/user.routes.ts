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

// 🔓 PUBLIC - No auth required
router.get("/", getAllUsers);  
router.get("/:id", getUserProfile); 

router.get("/me/activity", authMiddleware, getMyActivity);
router.delete("/:id", authMiddleware, deleteUser);
router.patch("/:id/role", authMiddleware, updateUserRole);

export default router;