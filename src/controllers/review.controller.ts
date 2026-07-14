// controllers/reviewController.ts
import type { Response } from "express";
import mongoose, { Types } from "mongoose";
import type { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { requireUserId } from "../utils/requireUserId.js";
import { HelpRequest } from "../model/HelpRequest.js";
import { UserProfile } from "../model/UserProfile.js";
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
  return Types.ObjectId.isValid(id);
}

function toObjectId(id: string): Types.ObjectId | null {
  if (!isValidObjectId(id)) return null;
  return new Types.ObjectId(id);
}

export async function createReview(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const { requestId, rating, comment } = req.body;

    if (!requestId || !rating) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    const helpRequest = await HelpRequest.findById(requestId);

    if (!helpRequest) {
      res.status(404).json({ message: "Request not found" });
      return;
    }

    if (helpRequest.status !== "completed") {
      res.status(400).json({ message: "Can only review completed requests" });
      return;
    }

    if (helpRequest.postedBy.toString() !== userId) {
      res.status(403).json({ message: "Only the requester can leave this review" });
      return;
    }

    if (!helpRequest.helper) {
      res.status(400).json({ message: "This request has no assigned helper" });
      return;
    }

    const existing = await Review.findOne({
      request: helpRequest._id,
      reviewer: userId,
    });

    if (existing) {
      res.status(400).json({ message: "You have already reviewed this request" });
      return;
    }

    const review = await Review.create({
      request: helpRequest._id,
      reviewer: userId,
      reviewee: helpRequest.helper,
      rating,
      comment: comment || "",
    });

    await HelpRequest.findByIdAndUpdate(
      helpRequest._id,
      { $push: { reviews: review._id } }
    );

    const stats = await Review.aggregate([
      { $match: { reviewee: new Types.ObjectId(helpRequest.helper.toString()) } },
      {
        $group: {
          _id: "$reviewee",
          avgRating: { $avg: "$rating" },
          completedCount: { $sum: 1 },
        },
      },
    ]);

    if (stats.length > 0) {
      await UserProfile.updateOne(
        { _id: helpRequest.helper },
        {
          $set: {
            avgRating: Math.round(stats[0].avgRating * 10) / 10,
            completedCount: stats[0].completedCount,
          },
        }
      );
    }

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: "Failed to submit review", error: (error as Error).message });
  }
}

export async function getReviewsForUser(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userIdParam = req.params.userId;
    const userId = getParamValue(userIdParam);

    if (!userId) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }

    if (!isValidObjectId(userId)) {
      res.status(400).json({ message: "Invalid user ID" });
      return;
    }

    const reviews = await Review.find({ reviewee: userId })
      .populate("reviewer", "name image avatarUrl")
      .populate("request", "title category")
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch reviews", error: (error as Error).message });
  }
}

export async function getReviewsByRequestId(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const requestIdParam = req.params.requestId;
    const requestId = getParamValue(requestIdParam);

    if (!requestId) {
      res.status(400).json({ message: "Request ID is required" });
      return;
    }

    if (!isValidObjectId(requestId)) {
      res.status(400).json({ message: "Invalid request ID" });
      return;
    }

    const reviews = await Review.find({ request: requestId })
      .populate("reviewer", "name avatarUrl role")
      .populate("reviewee", "name avatarUrl")
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch reviews", error: (error as Error).message });
  }
}

export async function getRecentReviews(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const limitParam = req.query.limit;
    const limit = getParamValue(limitParam) || "6";
    const limitNum = Math.min(parseInt(limit) || 6, 20);

    const reviews = await Review.find()
      .populate("reviewer", "name avatarUrl")
      .populate("reviewee", "name avatarUrl")
      .sort({ createdAt: -1 })
      .limit(limitNum);

    const formattedReviews = reviews.map((review) => {
      const reviewer = review.reviewer as { name?: string; avatarUrl?: string } | null;
      return {
        _id: review._id,
        rating: review.rating,
        comment: review.comment,
        reviewer: {
          name: reviewer?.name || "Anonymous",
          role: "Community Member",
          avatarUrl: reviewer?.avatarUrl,
        },
        createdAt: review.createdAt,
      };
    });

    res.status(200).json(formattedReviews);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch recent reviews",
      error: (error as Error).message,
    });
  }
}

export async function getReviewsByUserId(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userIdParam = req.params.userId;
    const userId = getParamValue(userIdParam);

    if (!userId) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }

    if (userId === "recent") {
      return getRecentReviews(req, res);
    }

    if (!isValidObjectId(userId)) {
      res.status(400).json({ message: "Invalid user ID" });
      return;
    }

    const reviews = await Review.find({ reviewee: userId })
      .populate("reviewer", "name avatarUrl")
      .populate("request", "title category")
      .sort({ createdAt: -1 });

    const formattedReviews = reviews.map((review) => {
      const reviewer = review.reviewer as { name?: string; avatarUrl?: string } | null;
      return {
        _id: review._id,
        rating: review.rating,
        comment: review.comment,
        reviewer: {
          name: reviewer?.name || "Anonymous",
          role: "Community Member",
          avatarUrl: reviewer?.avatarUrl,
        },
        createdAt: review.createdAt,
      };
    });

    res.status(200).json(formattedReviews);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch reviews",
      error: (error as Error).message,
    });
  }
}

export async function getUserReviewStats(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userIdParam = req.params.userId;
    const userId = getParamValue(userIdParam);

    if (!userId) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }

    if (!isValidObjectId(userId)) {
      res.status(400).json({ message: "Invalid user ID" });
      return;
    }

    const objectId = toObjectId(userId);
    if (!objectId) {
      res.status(400).json({ message: "Invalid user ID format" });
      return;
    }

    const stats = await Review.aggregate([
      { $match: { reviewee: objectId } },
      {
        $group: {
          _id: "$reviewee",
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    if (stats.length > 0) {
      res.status(200).json({
        avgRating: Math.round(stats[0].avgRating * 10) / 10,
        totalReviews: stats[0].totalReviews,
      });
    } else {
      res.status(200).json({
        avgRating: 0,
        totalReviews: 0,
      });
    }
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch user review stats",
      error: (error as Error).message,
    });
  }
}

export async function hasUserReviewed(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const requestIdParam = req.params.requestId;
    const requestId = getParamValue(requestIdParam);

    if (!requestId) {
      res.status(400).json({ message: "Request ID is required" });
      return;
    }

    if (!isValidObjectId(requestId)) {
      res.status(400).json({ message: "Invalid request ID" });
      return;
    }

    const review = await Review.findOne({
      request: requestId,
      reviewer: userId,
    });

    res.status(200).json({
      hasReviewed: !!review,
      reviewId: review?._id || null,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to check review status",
      error: (error as Error).message,
    });
  }
}