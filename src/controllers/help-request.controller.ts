import type { Response } from "express";
import mongoose, { type QueryFilter } from "mongoose";

import type { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { requireUserId } from "../utils/requireUserId.js";
import { HelpRequest, type IHelpRequest } from "../model/HelpRequest.js";

type HelpRequestFilter = QueryFilter<IHelpRequest>;

function getValidId(
  id: unknown,
  res: Response
): string | null {
  if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: "Invalid request id" });
    return null;
  }
  return id;
}

export async function createHelpRequest(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const {
      title,
      shortDescription,
      fullDescription,
      category,
      areaLabel,
      coordinates,
      budget,
      isPaid,
      preferredTime,
      imageUrl,
    } = req.body;

    if (!title || !shortDescription || !fullDescription || !category || !areaLabel || !coordinates) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    const helpRequest = await HelpRequest.create({
      title,
      shortDescription,
      fullDescription,
      category,
      areaLabel,
      location: { type: "Point", coordinates },
      budget,
      isPaid: Boolean(isPaid),
      preferredTime,
      imageUrl,
      postedBy: userId,
      status: "open",
    });

    res.status(201).json(helpRequest);
  } catch (error) {
    res.status(500).json({ message: "Failed to create request", error: (error as Error).message });
  }
}

export async function getHelpRequests(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { search, category, area, status, sort = "newest", page = "1", limit = "12" } = req.query;

    const filter: HelpRequestFilter = {};

    if (status) {
      filter.status = status as IHelpRequest["status"];
    } else {
      filter.status = { $in: ["open", "matched"] };
    }

    if (category) filter.category = category as IHelpRequest["category"];
    if (area) filter.areaLabel = area as string;
    if (search) filter.$text = { $search: search as string };

    const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit as string, 10) || 12, 1);
    const skip = (pageNum - 1) * limitNum;

    let sortQuery: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort === "urgent") sortQuery = { preferredTime: 1 };
    if (sort === "oldest") sortQuery = { createdAt: 1 };

    const [items, total] = await Promise.all([
      HelpRequest.find(filter)
        .populate("postedBy", "name image area avgRating")
        .sort(sortQuery)
        .skip(skip)
        .limit(limitNum),
      HelpRequest.countDocuments(filter),
    ]);

    res.status(200).json({
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch requests", error: (error as Error).message });
  }
}

export async function getHelpRequestById(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const id = getValidId(req.params.id, res);
    if (!id) return;

    const helpRequest = await HelpRequest.findById(id)
      .populate("postedBy", "name image area avgRating completedCount")
      .populate("helper", "name image area avgRating completedCount");

    if (!helpRequest) {
      res.status(404).json({ message: "Request not found" });
      return;
    }

    res.status(200).json(helpRequest);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch request", error: (error as Error).message });
  }
}

export async function getRelatedHelpRequests(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const id = getValidId(req.params.id, res);
    if (!id) return;

    const current = await HelpRequest.findById(id);

    if (!current) {
      res.status(404).json({ message: "Request not found" });
      return;
    }

    const relatedFilter: HelpRequestFilter = {
      _id: { $ne: current._id },
      category: current.category,
      status: { $in: ["open", "matched"] },
    };

    const related = await HelpRequest.find(relatedFilter)
      .populate("postedBy", "name image")
      .sort({ createdAt: -1 })
      .limit(3);

    res.status(200).json(related);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch related requests", error: (error as Error).message });
  }
}

export async function acceptHelpRequest(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const id = getValidId(req.params.id, res);
    if (!id) return;

    const helpRequest = await HelpRequest.findById(id);

    if (!helpRequest) {
      res.status(404).json({ message: "Request not found" });
      return;
    }

    if (helpRequest.status !== "open") {
      res.status(400).json({ message: "This request is no longer open" });
      return;
    }

    if (helpRequest.postedBy.toString() === userId) {
      res.status(400).json({ message: "You cannot accept your own request" });
      return;
    }

    helpRequest.helper = new mongoose.Types.ObjectId(userId);
    helpRequest.status = "matched";
    await helpRequest.save();

    res.status(200).json(helpRequest);
  } catch (error) {
    res.status(500).json({ message: "Failed to accept request", error: (error as Error).message });
  }
}

export async function markInProgress(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const id = getValidId(req.params.id, res);
    if (!id) return;

    const helpRequest = await HelpRequest.findById(id);

    if (!helpRequest) {
      res.status(404).json({ message: "Request not found" });
      return;
    }

    if (!helpRequest.helper || helpRequest.helper.toString() !== userId) {
      res.status(403).json({ message: "Only the assigned helper can update this" });
      return;
    }

    if (helpRequest.status !== "matched") {
      res.status(400).json({ message: "Request must be matched first" });
      return;
    }

    helpRequest.status = "in_progress";
    await helpRequest.save();

    res.status(200).json(helpRequest);
  } catch (error) {
    res.status(500).json({ message: "Failed to update request", error: (error as Error).message });
  }
}

export async function markComplete(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const id = getValidId(req.params.id, res);
    if (!id) return;

    const helpRequest = await HelpRequest.findById(id);

    if (!helpRequest) {
      res.status(404).json({ message: "Request not found" });
      return;
    }

    if (helpRequest.postedBy.toString() !== userId) {
      res.status(403).json({ message: "Only the requester can mark this complete" });
      return;
    }

    if (!["matched", "in_progress"].includes(helpRequest.status)) {
      res.status(400).json({ message: "Request cannot be completed from its current state" });
      return;
    }

    helpRequest.status = "completed";
    await helpRequest.save();

    res.status(200).json(helpRequest);
  } catch (error) {
    res.status(500).json({ message: "Failed to complete request", error: (error as Error).message });
  }
}

export async function cancelHelpRequest(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const id = getValidId(req.params.id, res);
    if (!id) return;

    const helpRequest = await HelpRequest.findById(id);

    if (!helpRequest) {
      res.status(404).json({ message: "Request not found" });
      return;
    }

    if (helpRequest.postedBy.toString() !== userId) {
      res.status(403).json({ message: "Only the requester can cancel this" });
      return;
    }

    if (helpRequest.status !== "open") {
      res.status(400).json({ message: "Only open requests can be cancelled" });
      return;
    }

    helpRequest.status = "cancelled";
    await helpRequest.save();

    res.status(200).json(helpRequest);
  } catch (error) {
    res.status(500).json({ message: "Failed to cancel request", error: (error as Error).message });
  }
}

export async function deleteHelpRequest(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const id = getValidId(req.params.id, res);
    if (!id) return;

    const helpRequest = await HelpRequest.findById(id);

    if (!helpRequest) {
      res.status(404).json({ message: "Request not found" });
      return;
    }

    const isOwner = helpRequest.postedBy.toString() === userId;
    const isAdmin = req.user?.role === "admin";

    if (!isOwner && !isAdmin) {
      res.status(403).json({ message: "Not authorized to delete this request" });
      return;
    }

    await helpRequest.deleteOne();
    res.status(200).json({ message: "Request deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete request", error: (error as Error).message });
  }
}

export async function getMyPostedRequests(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const filter: HelpRequestFilter = { postedBy: userId };

    const requests = await HelpRequest.find(filter)
      .populate("postedBy", "name image avgRating") 
      .populate("helper", "name image avgRating")
      .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch your requests", error: (error as Error).message });
  }
}

export async function getMyHelpingRequests(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const filter: HelpRequestFilter = { helper: userId };

    const requests = await HelpRequest.find(filter)
      .populate("postedBy", "name image avgRating")
      .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch your helping tasks", error: (error as Error).message });
  }
}