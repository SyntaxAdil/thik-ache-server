import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";

let isConnected = false;

export const connectDB = async (): Promise<void> => {
  if (isConnected) return;

  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is missing");
    }

    
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "thikache", 
    });

    isConnected = true;
    console.log("MongoDB connected to database: thikache");
  } catch (err) {
    const error = err as Error;
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

export const getDB = (): mongoose.mongo.Db => {
  if (!mongoose.connection.db) {
    throw new Error("Database not connected yet");
  }
  return mongoose.connection.db;
};