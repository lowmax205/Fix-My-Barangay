import rateLimit from "express-rate-limit";
import { Request, Response, NextFunction } from "express";
import { query } from "../db/connection";

// Rate limiting configuration per constitutional requirements:
// Maximum 5 reports per IP address per hour, 20 per day
const HOURLY_LIMIT = 5;
const DAILY_LIMIT = 20;

// Helper function to get client IP properly
const getClientIp = (req: Request): string => {
  // Handle various proxy configurations
  const forwarded = req.headers["x-forwarded-for"];
  const realIp = req.headers["x-real-ip"];

  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded.split(",")[0].trim();
  }

  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  return req.ip || req.socket.remoteAddress || "unknown";
};

// Create rate limiter for report submissions
// Internal helper to detect privileged users (admins or authenticated service calls)
function isPrivileged(req: Request): boolean {
  // 1. Admin flag already set by admin auth middleware
  if ((req as any).isAdmin) return true;

  // 2. Internal service calls
  if (req.headers["x-internal-service-key"]) return true;

  // 3. Admin path heuristic (so /api/v1/admin/* not throttled when auth applied later in chain)
  if (req.path && req.path.startsWith("/api/v1/admin")) return true;

  // 4. Bearer token present (client authenticated through Clerk front-end)
  const authHeader =
    req.headers["authorization"] || req.headers["Authorization"]; // case-insensitive
  if (
    typeof authHeader === "string" &&
    authHeader.toLowerCase().startsWith("bearer ")
  ) {
    return true;
  }

  // 5. Clerk session cookie heuristic (depends on naming; adjust if different)
  const cookie = req.headers.cookie || "";
  if (cookie.includes("__session") || cookie.toLowerCase().includes("clerk")) {
    return true;
  }

  return false;
}

const baseReportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: HOURLY_LIMIT,
  message: {
    error: "Rate limit exceeded",
    message: `Maximum ${HOURLY_LIMIT} reports per hour allowed`,
    retryAfter: "1 hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: "Rate limit exceeded",
      message: `Maximum ${HOURLY_LIMIT} reports per hour allowed`,
      retryAfter: "1 hour",
    });
  },
});

// Wrapper that skips limiting for privileged users
export const reportRateLimit = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (isPrivileged(req)) {
    return next();
  }
  return baseReportLimiter(req, res, next);
};

// General API rate limiter (more permissive for read operations)
const baseGeneralLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 300, // more generous for read-heavy endpoints
  message: {
    error: "Too many requests",
    message: "Too many requests from this IP, please try again later",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalRateLimit = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Skip general limiter for privileged users
  if (isPrivileged(req)) return next();

  // Don’t throttle report submission here (handled by reportRateLimit)
  if (req.method === "POST" && req.path.startsWith("/api/v1/reports")) {
    return next();
  }

  // Exempt GET list fetches from heavy throttling, but still allow limiter to count
  // Returning next() here bypasses limiter entirely for these paths
  if (req.method === "GET" && req.path.startsWith("/api/v1/reports")) {
    return next();
  }
  return baseGeneralLimiter(req, res, next);
};
