import type { Response } from "express";

import type { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { requireUserId } from "../utils/requireUserId.js";
import { UserProfile } from "../model/UserProfile.js";
import { HelpRequest } from "../model/HelpRequest.js";
import { Review } from "../model/Review.js";

export async function getUserProfile(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    const user = await UserProfile.findById(id).select(
      "name image area avgRating completedCount role"
    );

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch profile", error: (error as Error).message });
  }
}

export async function getMyActivity(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const limit = 10;

    const [postedActivity, helpingActivity, reviewActivity] = await Promise.all([
      HelpRequest.find({
        postedBy: userId,
        status: { $in: ["matched", "completed"] },
      })
        .populate("helper", "name image")
        .sort({ updatedAt: -1 })
        .limit(limit),
      HelpRequest.find({
        helper: userId,
        status: "completed",
      })
        .populate("postedBy", "name image")
        .sort({ updatedAt: -1 })
        .limit(limit),
      Review.find({ reviewee: userId })
        .populate("reviewer", "name image")
        .sort({ createdAt: -1 })
        .limit(limit),
    ]);

    const activity = [
      ...postedActivity.map((item) => ({
        type: "request_update" as const,
        updatedAt: item.updatedAt,
        data: item,
      })),
      ...helpingActivity.map((item) => ({
        type: "helping_update" as const,
        updatedAt: item.updatedAt,
        data: item,
      })),
      ...reviewActivity.map((item) => ({
        type: "review_received" as const,
        updatedAt: item.createdAt,
        data: item,
      })),
    ]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);

    res.status(200).json(activity);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch activity", error: (error as Error).message });
  }
}