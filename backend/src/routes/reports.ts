import { Router, Request, Response } from "express";
import { ReportModel, CreateReportInput, ReportFilter } from "../models/Report";
import {
  validateReportCategory,
  validateReportStatus,
  validateDescription,
} from "../models/Report";
import { LocationValidator } from "../models/Location";
import { reportRateLimit } from "../middleware/rateLimiter";
import { findPotentialDuplicates } from "../services/duplicateDetector";

const router = Router();

// POST /api/v1/reports - Submit new report
router.post(
  "/reports",
  reportRateLimit,
  async (req: Request, res: Response) => {
    try {
      const {
        category,
        description,
        location,
        address,
        photo_url,
        photo_public_id,
      } = req.body;

      // Validate required fields
      if (!category || !description || !location) {
        return res.status(400).json({
          error: "Validation failed",
          message: "Category, description, and location are required",
        });
      }

      // Validate category
      if (!validateReportCategory(category)) {
        return res.status(400).json({
          error: "Invalid category",
          message:
            "Category must be one of: Infrastructure, Sanitation, Safety, Water, Electrical",
        });
      }

      // Validate description
      if (!validateDescription(description)) {
        return res.status(400).json({
          error: "Invalid description",
          message: "Description must be between 1 and 500 characters",
        });
      }

      // Validate location
      const locationValidation = LocationValidator.validateLocation(location);
      if (!locationValidation.isValid) {
        return res.status(400).json({
          error: "Invalid location",
          message: locationValidation.error,
        });
      }

      // Get reporter IP
      const reporter_ip = req.ip || req.connection.remoteAddress || "unknown";

      // Create report input
      const reportData: CreateReportInput = {
        category,
        description,
        location: locationValidation.location!,
        address,
        photo_url,
        photo_public_id,
        reporter_ip,
      };

      // Duplicate detection (non-blocking if fails)
      let duplicates: any[] = [];
      try {
        duplicates = await findPotentialDuplicates(reportData.location);
      } catch (dupErr) {
        console.warn("Duplicate detection failed", dupErr);
      }

      // Create report in database
      const report = await ReportModel.create(reportData);

      // Log successful report creation
      console.log(`✅ New report created: ${report.id} from IP ${reporter_ip}`);

      // Return created report
      res.status(201).json({
        success: true,
        data: report,
        duplicates,
        message: duplicates.length
          ? `Report submitted. ${duplicates.length} similar recent report(s) nearby.`
          : "Report submitted successfully",
      });
    } catch (error) {
      console.error("Error creating report:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to create report",
      });
    }
  }
);

// GET /api/v1/reports - Get reports with filtering
router.get("/reports", async (req: Request, res: Response) => {
  try {
    const { category, status, limit = "20", offset = "0" } = req.query;

    // Determine max limit: env override > dev small cap > production default
    const parsedEnvMax = process.env.REPORTS_MAX_LIMIT
      ? parseInt(process.env.REPORTS_MAX_LIMIT, 10)
      : undefined;
    const MAX_REPORTS_LIMIT =
      parsedEnvMax && !isNaN(parsedEnvMax) && parsedEnvMax > 0
        ? parsedEnvMax
        : process.env.NODE_ENV === "development"
        ? 5
        : 100;

    // Validate query parameters
    const filter: ReportFilter = {};

    if (category && typeof category === "string") {
      if (!validateReportCategory(category)) {
        return res.status(400).json({
          error: "Invalid category",
          message:
            "Category must be one of: Infrastructure, Sanitation, Safety, Water, Electrical",
        });
      }
      filter.category = category;
    }

    if (status && typeof status === "string") {
      if (!validateReportStatus(status)) {
        return res.status(400).json({
          error: "Invalid status",
          message:
            "Status must be one of: Submitted, In Review, In Progress, Resolved, Closed",
        });
      }
      filter.status = status;
    }

    // Parse and validate pagination parameters
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    if (isNaN(limitNum) || limitNum < 1) {
      return res.status(400).json({
        error: "Invalid limit",
        message: `Limit must be a positive integer (max ${MAX_REPORTS_LIMIT})`,
      });
    }
    const effectiveLimit = Math.min(limitNum, MAX_REPORTS_LIMIT);

    if (isNaN(offsetNum) || offsetNum < 0) {
      return res.status(400).json({
        error: "Invalid offset",
        message: "Offset must be a non-negative number",
      });
    }

    filter.limit = effectiveLimit;
    filter.offset = offsetNum;

    // Get reports from database
    const result = await ReportModel.findMany(filter);

    res.json({
      success: true,
      data: {
        reports: result.reports,
        total: result.total,
        limit: effectiveLimit,
        offset: offsetNum,
        hasMore: offsetNum + effectiveLimit < result.total,
        maxLimit: MAX_REPORTS_LIMIT,
        limitRequested: limitNum,
        limitApplied: effectiveLimit,
      },
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    const errMsg = (error as any)?.message || "Failed to fetch reports";
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch reports",
      details: errMsg,
    });
  }
});

// GET /api/v1/reports/:id - Get specific report
router.get("/reports/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: "Invalid ID",
        message: "Report ID must be a valid UUID",
      });
    }

    // Get report from database
    const report = await ReportModel.findById(id);

    if (!report) {
      return res.status(404).json({
        error: "Not found",
        message: "Report not found",
      });
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("Error fetching report:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch report",
    });
  }
});

export default router;
