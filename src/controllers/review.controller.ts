// controllers/reviewController.ts
import type { Response } from "express";
import mongoose from "mongoose";
import type { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { requireUserId } from "../utils/requireUserId.js";
import { HelpRequest } from "../model/HelpRequest.js";
import { UserProfile } from "../model/UserProfile.js";
import { Review } from "../model/Review.js";

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

    // Push the review ID to the HelpRequest's reviews array
    await HelpRequest.findByIdAndUpdate(
      helpRequest._id,
      { $push: { reviews: review._id } }
    );

    const stats = await Review.aggregate([
      { $match: { reviewee: new mongoose.Types.ObjectId(helpRequest.helper.toString()) } },
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
    const { userId } = req.params;

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
    const { requestId } = req.params;

    const reviews = await Review.find({ request: requestId })
      .populate("reviewer", "name avatarUrl role")
      .populate("reviewee", "name avatarUrl")
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch reviews", error: (error as Error).message });
  }
}