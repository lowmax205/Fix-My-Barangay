import { Request, Response, NextFunction } from "express";
import { query } from "../db/connection";

// Extend Request interface to include clerk user info
declare module "express-serve-static-core" {
  interface Request {
    clerkUserId?: string;
    isAdmin?: boolean;
    adminRole?: "moderator" | "admin";
  }
}

// Simplified authentication middleware for development
export const authenticateAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // For development, always allow access for testing
    req.clerkUserId = "dev-admin-user";
    req.isAdmin = true;
    req.adminRole = "admin";
    return next();
  } catch (error) {
    console.error("Admin authentication error:", error);
    return res.status(500).json({
      error: "Authentication error",
      message: "Failed to authenticate admin user",
    });
  }
};

// Middleware to require specific admin role
export const requireAdminRole = (requiredRole: "moderator" | "admin") => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAdmin) {
      return res.status(401).json({
        error: "Authentication required",
        message: "Admin authentication required",
      });
    }

    // Admin can access moderator endpoints, but not vice versa
    if (requiredRole === "admin" && req.adminRole !== "admin") {
      return res.status(403).json({
        error: "Insufficient permissions",
        message: "Admin role required for this operation",
      });
    }

    next();
  };
};

// Helper function to create admin user (for setup/testing)
export const createAdminUser = async (
  clerkUserId: string,
  email: string,
  role: "moderator" | "admin" = "moderator"
) => {
  try {
    await query(
      `INSERT INTO admin_users (clerk_user_id, email, role) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (clerk_user_id) 
       DO UPDATE SET email = $2, role = $3`,
      [clerkUserId, email, role]
    );
    return true;
  } catch (error) {
    console.error("Error creating admin user:", error);
    return false;
  }
};
