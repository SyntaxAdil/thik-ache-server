import express from "express";
import type { Request, Response, NextFunction } from "express";

interface CustomError extends Error {
  statusCode?: number;
}

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res, next);
    } catch (error) {
      const err = error as CustomError;
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Internal Server error",
      });
    }
  };
};

export default asyncHandler;