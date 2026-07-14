import { Router } from "express";
import helpRequestRoutes from "./help-request.routes.js";
import reviewRoutes from "./review.routes.js";
import userRoutes from "./user.routes.js";

const router = Router();

router.use("/requests", helpRequestRoutes);
router.use("/reviews", reviewRoutes);
router.use("/users", userRoutes);

export default router;