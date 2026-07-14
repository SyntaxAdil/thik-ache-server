import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/authMiddleware.js";

export function requireUserId(
  req: AuthenticatedRequest,
  res: Response
): string | null {
  if (!req.user?._id) {
    res.status(401).json({ success: false, message: "Unauthorized - No user id" });
    return null;
  }
  return req.user._id;
}