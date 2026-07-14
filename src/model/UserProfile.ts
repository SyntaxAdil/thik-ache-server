import mongoose, { Schema, Document } from "mongoose";

export interface IUserProfile extends Document {
  name: string;
  email: string;
  role: "user" | "admin";
  area?: string;
  avgRating: number;
  completedCount: number;
}

const UserProfileSchema = new Schema<IUserProfile>(
  {
    name: String,
    email: String,
    role: { type: String, enum: ["user", "admin"], default: "user" },
    area: String,
    avgRating: { type: Number, default: 0 },
    completedCount: { type: Number, default: 0 },
  },
  { collection: "user", strict: false }
);

export const UserProfile =
  mongoose.models.UserProfile ||
  mongoose.model<IUserProfile>("UserProfile", UserProfileSchema);