import mongoose, { Schema, Document, Types } from "mongoose";

export interface IReview extends Document {
  request: Types.ObjectId;
  reviewer: Types.ObjectId;
  reviewee: Types.ObjectId;
  rating: number;
  comment: string;
  createdAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    request: { type: Schema.Types.ObjectId, ref: "HelpRequest", required: true },
    reviewer: { type: Schema.Types.ObjectId, ref: "UserProfile", required: true },
    reviewee: { type: Schema.Types.ObjectId, ref: "UserProfile", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

ReviewSchema.index({ request: 1, reviewer: 1 }, { unique: true });

export const Review =
  mongoose.models.Review || mongoose.model<IReview>("Review", ReviewSchema);