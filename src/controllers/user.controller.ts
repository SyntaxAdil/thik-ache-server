// controllers/user.controller.ts
import type { Response } from "express";
import mongoose from "mongoose";
import type { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { requireUserId } from "../utils/requireUserId.js";
import { UserProfile } from "../model/UserProfile.js";
import { HelpRequest } from "../model/HelpRequest.js";
import { Review } from "../model/Review.js";

function getParamValue(param: unknown): string | null {
  if (!param) return null;
  if (Array.isArray(param)) return param[0] ? String(param[0]) : null;
  if (typeof param === "string") return param;
  if (typeof param === "object" && param !== null) {
    return String(param);
  }
  return null;
}

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

export async function getUserProfile(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const idParam = req.params.id;
    const id = getParamValue(idParam);

    if (!id) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid user ID" });
      return;
    }

    const user = await UserProfile.findById(id).select(
      "name email image avatarUrl area avgRating completedCount role createdAt updatedAt"
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
        .limit(limit)
        .lean(),
      HelpRequest.find({
        helper: userId,
        status: "completed",
      })
        .populate("postedBy", "name image")
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean(),
      Review.find({ reviewee: userId })
        .populate("reviewer", "name image")
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
    ]);

    const activity = [
      ...postedActivity.map((item) => ({
        type: "request_update" as const,
        updatedAt: (item as any).updatedAt || new Date(),
        data: item,
      })),
      ...helpingActivity.map((item) => ({
        type: "helping_update" as const,
        updatedAt: (item as any).updatedAt || new Date(),
        data: item,
      })),
      ...reviewActivity.map((item) => ({
        type: "review_received" as const,
        updatedAt: (item as any).createdAt || new Date(),
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

export async function getAllUsers(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const users = await UserProfile.find()
      .select("name email image avatarUrl area avgRating completedCount role createdAt")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch users",
      error: (error as Error).message,
    });
  }
}

export async function deleteUser(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const idParam = req.params.id;
    const id = getParamValue(idParam);

    if (!id) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid user ID" });
      return;
    }

    const user = await UserProfile.findById(id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (user.role === "admin") {
      res.status(403).json({ message: "Cannot delete admin users" });
      return;
    }

    await UserProfile.findByIdAndDelete(id);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete user",
      error: (error as Error).message,
    });
  }
}

export async function updateUserRole(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const idParam = req.params.id;
    const id = getParamValue(idParam);

    if (!id) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid user ID" });
      return;
    }

    const { role } = req.body;

    if (!role || !["user", "admin"].includes(role)) {
      res.status(400).json({ message: "Invalid role" });
      return;
    }

    const user = await UserProfile.findById(id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    user.role = role;
    await user.save();

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update user role",
      error: (error as Error).message,
    });
  }
}