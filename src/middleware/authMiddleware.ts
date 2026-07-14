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

const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Unauthorized - No token provided",
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Unauthorized - Token missing",
      });
      return;
    }

    const payload = await validateToken(token);

    req.user = {
      ...payload,
      _id: payload.sub,
      role: (payload.role as string) || "user",
      email: payload.email as string,
    };

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Unauthorized - Invalid token",
    });
  }
};

export default authMiddleware;