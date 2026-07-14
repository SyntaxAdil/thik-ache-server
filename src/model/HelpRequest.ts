import mongoose, { Schema, Types, type Model } from "mongoose";

export type RequestStatus =
  | "open"
  | "matched"
  | "in_progress"
  | "completed"
  | "cancelled";
export type RequestCategory =
  | "tech"
  | "tutoring"
  | "errand"
  | "moving"
  | "repair"
  | "other";

export interface IHelpRequest {
  title: string;
  shortDescription: string;
  fullDescription: string;
  category: RequestCategory;
  location: { type: "Point"; coordinates: [number, number] };
  areaLabel: string;
  budget?: number;
  isPaid: boolean;
  preferredTime?: Date;
  imageUrl?: string;
  status: RequestStatus;
  postedBy: Types.ObjectId;
  helper?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const HelpRequestSchema = new Schema<IHelpRequest>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    shortDescription: { type: String, required: true, maxlength: 200 },
    fullDescription: { type: String, required: true },
    category: {
      type: String,
      enum: ["tech", "tutoring", "errand", "moving", "repair", "other"],
      required: true,
    },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    areaLabel: { type: String, required: true },
    budget: { type: Number, min: 0 },
    isPaid: { type: Boolean, default: false },
    preferredTime: { type: Date },
    imageUrl: { type: String },
    status: {
      type: String,
      enum: ["open", "matched", "in_progress", "completed", "cancelled"],
      default: "open",
    },
    postedBy: {
      type: Schema.Types.ObjectId,
      ref: "UserProfile",
      required: true,
    },
    helper: { type: Schema.Types.ObjectId, ref: "UserProfile", default: null },
  },
  { timestamps: true },
);

HelpRequestSchema.index({ location: "2dsphere" });
HelpRequestSchema.index({ title: "text", shortDescription: "text" });
HelpRequestSchema.index({ status: 1, category: 1, areaLabel: 1 });

export const HelpRequest: Model<IHelpRequest> =
  (mongoose.models.HelpRequest as Model<IHelpRequest>) ||
  mongoose.model<IHelpRequest>("HelpRequest", HelpRequestSchema);