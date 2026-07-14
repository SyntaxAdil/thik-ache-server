// models/HelpRequest.ts
import mongoose, { Schema, Types, type Model } from "mongoose";

export interface IHelpRequest {
  title: string;
  shortDescription: string;
  fullDescription: string;
  category: string;
  location: {
    type?: string;
    coordinates?: [number, number];
  };
  areaLabel: string; // This is a separate field
  budget?: number;
  isPaid: boolean;
  preferredTime?: string;
  createdAt?: Date;
  status: "open" | "matched" | "in_progress" | "completed" | "cancelled";
  imageUrl?: string;
  postedBy: Types.ObjectId;
  helper?: Types.ObjectId;
  reviews: Types.ObjectId[];
}

const HelpRequestSchema = new Schema<IHelpRequest>(
  {
    title: { type: String, required: true },
    shortDescription: { type: String, required: true },
    fullDescription: { type: String, required: true },
    category: { type: String, required: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    areaLabel: { type: String, required: true }, // Separate field
    budget: { type: Number },
    isPaid: { type: Boolean, default: false },
    preferredTime: { type: String },
    status: {
      type: String,
      enum: ["open", "matched", "in_progress", "completed", "cancelled"],
      default: "open",
    },
    imageUrl: { type: String },
    postedBy: { type: Schema.Types.ObjectId, ref: "UserProfile", required: true },
    helper: { type: Schema.Types.ObjectId, ref: "UserProfile" },
    reviews: [{ type: Schema.Types.ObjectId, ref: "Review" }],
  },
  { timestamps: true }
);

export const HelpRequest: Model<IHelpRequest> =
  (mongoose.models.HelpRequest as Model<IHelpRequest>) ||
  mongoose.model<IHelpRequest>("HelpRequest", HelpRequestSchema);