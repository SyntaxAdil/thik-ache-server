import mongoose, { Schema, type Model } from "mongoose";

export interface IUserProfile {
  name: string;
  email: string;
  role: "user" | "admin";
  area?: string;
  avgRating: number;
  completedCount: number;
  phoneNumber: string;
  image?: string;
}

const UserProfileSchema = new Schema<IUserProfile>(
  {
    name: String,
    email: String,
    role: { type: String, enum: ["user", "admin"], default: "user" },
    area: String,
    avgRating: { type: Number, default: 0 },
    completedCount: { type: Number, default: 0 },
    phoneNumber: String,
    image: String,
  },
  { collection: "user", strict: false }
);

export const UserProfile: Model<IUserProfile> =
  (mongoose.models.UserProfile as Model<IUserProfile>) ||
  mongoose.model<IUserProfile>("UserProfile", UserProfileSchema);