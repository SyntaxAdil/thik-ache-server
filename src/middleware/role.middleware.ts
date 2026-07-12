import express from "express";
import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./authMiddleware.js";

const checkRoleMiddleware = (roles: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): any => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ success: false, message: "Unauthorized - Role missing" });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden - Insufficient permissions",
      });
    }

    next();
  };
};

export default checkRoleMiddleware;