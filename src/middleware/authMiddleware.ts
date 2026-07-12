import express from "express";
import type { Request, Response, NextFunction } from "express";
import type { JWTPayload } from "jose";
import validateToken from "../utils/validateToken.js";


export interface CustomUserPayload extends JWTPayload {
  _id?: string; 
  role?: string;
  email?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: CustomUserPayload;
}

const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - No token provided",
      });
    }
    
    const token = authHeader.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Token missing",
      });
    }

    const payload = await validateToken(token);

    req.user = payload as CustomUserPayload; 
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized - Invalid token",
    });
  }
};

export default authMiddleware;