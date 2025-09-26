import { Router, Request, Response } from "express";
import { authenticateAdmin, requireAdminRole } from "../middleware/adminAuth";
import { ReportModel, UpdateReportInput } from "../models/Report";

const router = Router();

// Apply admin authentication to all routes
router.use(authenticateAdmin);

// GET /api/v1/admin/reports - Get all reports with admin filtering
router.get(
  "/reports",
  requireAdminRole("moderator"),
  async (req: Request, res: Response) => {
    try {
      const {
        category,
        status,
        limit = "20",
        offset = "0",
        sortBy = "created_at",
        sortOrder = "desc",
        search,
      } = req.query;

      // Build filter object
      const filter: any = {};

      if (category && typeof category === "string") {
        filter.category = category;
      }

      if (status && typeof status === "string") {
        filter.status = status;
      }

      // Parse pagination
      const limitNum = Math.min(parseInt(limit as string, 10) || 20, 100);
      const offsetNum = parseInt(offset as string, 10) || 0;

      filter.limit = limitNum;
      filter.offset = offsetNum;

      // Get reports from database
      const result = await ReportModel.findMany(filter);

      res.json({
        success: true,
        data: {
          reports: result.reports,
          total: result.total,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < result.total,
          pagination: {
            currentPage: Math.floor(offsetNum / limitNum) + 1,
            totalPages: Math.ceil(result.total / limitNum),
            pageSize: limitNum,
          },
        },
        message: "Admin reports fetched successfully",
      });
    } catch (error) {
      console.error("Error fetching admin reports:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch admin reports",
      });
    }
  }
);

// PUT /api/v1/admin/reports/:id - Update report status and admin notes
router.put(
  "/reports/:id",
  requireAdminRole("moderator"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, admin_notes, duplicate_of } = req.body;

      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return res.status(400).json({
          error: "Invalid ID",
          message: "Report ID must be a valid UUID",
        });
      }

      // Build update data
      const updateData: UpdateReportInput = {};

      if (status) {
        const validStatuses = [
          "Submitted",
          "In Review",
          "In Progress",
          "Resolved",
          "Closed",
        ];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({
            error: "Invalid status",
            message: `Status must be one of: ${validStatuses.join(", ")}`,
          });
        }
        updateData.status = status;
      }

      if (admin_notes !== undefined) {
        if (typeof admin_notes === "string" && admin_notes.length <= 1000) {
          updateData.admin_notes = admin_notes;
        } else {
          return res.status(400).json({
            error: "Invalid admin notes",
            message:
              "Admin notes must be a string with maximum 1000 characters",
          });
        }
      }

      if (duplicate_of !== undefined) {
        if (
          duplicate_of === null ||
          (typeof duplicate_of === "string" && uuidRegex.test(duplicate_of))
        ) {
          updateData.duplicate_of = duplicate_of;
        } else {
          return res.status(400).json({
            error: "Invalid duplicate_of",
            message: "duplicate_of must be null or a valid UUID",
          });
        }
      }

      // Update report
      const updatedReport = await ReportModel.update(id, updateData);

      if (!updatedReport) {
        return res.status(404).json({
          error: "Report not found",
          message: "Report with the specified ID was not found",
        });
      }

      // Log admin action
      console.log(
        `📝 Admin action: Report ${id} updated by ${req.clerkUserId} (${req.adminRole}):`,
        updateData
      );

      res.json({
        success: true,
        data: updatedReport,
        message: "Report updated successfully",
      });
    } catch (error) {
      console.error("Error updating report:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to update report",
      });
    }
  }
);

// PATCH /api/v1/admin/reports/:id/status - Update only status field (explicit endpoint for frontend simplicity)
router.patch(
  "/reports/:id/status",
  requireAdminRole("moderator"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return res.status(400).json({
          error: "Invalid ID",
          message: "Report ID must be a valid UUID",
        });
      }

      const validStatuses = [
        "Submitted",
        "In Review",
        "In Progress",
        "Resolved",
        "Closed",
      ];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          error: "Invalid status",
          message: `Status must be one of: ${validStatuses.join(", ")}`,
        });
      }

      const updated = await ReportModel.update(id, { status });
      if (!updated) {
        return res.status(404).json({
          error: "Report not found",
          message: "Report with the specified ID was not found",
        });
      }

      console.log(
        `📝 Admin action: Report ${id} status updated to ${status} by ${req.clerkUserId}`
      );

      res.json({ success: true, data: updated, message: "Status updated" });
    } catch (error) {
      console.error("Error updating report status:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to update report status",
      });
    }
  }
);

// DELETE /api/v1/admin/reports/:id - Delete report (admin only)
router.delete(
  "/reports/:id",
  requireAdminRole("admin"),
  async (req: Request, res: Response) => {
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

      const deleted = await ReportModel.delete(id);

      if (!deleted) {
        return res.status(404).json({
          error: "Report not found",
          message: "Report with the specified ID was not found",
        });
      }

      // Log admin action
      console.log(
        `🗑️ Admin action: Report ${id} deleted by ${req.clerkUserId} (${req.adminRole})`
      );

      res.json({
        success: true,
        message: "Report deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting report:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to delete report",
      });
    }
  }
);

// GET /api/v1/admin/stats - Get dashboard statistics
router.get(
  "/stats",
  requireAdminRole("moderator"),
  async (req: Request, res: Response) => {
    try {
      // This would typically involve complex queries to get statistics
      // For now, return basic stats structure
      const stats = {
        totalReports: 0,
        statusBreakdown: {
          submitted: 0,
          "in-review": 0,
          "in-progress": 0,
          resolved: 0,
          closed: 0,
        },
        categoryBreakdown: {
          infrastructure: 0,
          sanitation: 0,
          safety: 0,
          water: 0,
          electrical: 0,
        },
        recentActivity: {
          last24Hours: 0,
          last7Days: 0,
          last30Days: 0,
        },
      };

      // In a real implementation, these would be database queries
      // For now, return the structure for frontend development

      res.json({
        success: true,
        data: stats,
        message: "Admin statistics retrieved",
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch admin statistics",
      });
    }
  }
);

// POST /api/v1/admin/users - Create admin user (admin only)
router.post(
  "/users",
  requireAdminRole("admin"),
  async (req: Request, res: Response) => {
    try {
      const { clerk_user_id, email, role = "moderator" } = req.body;

      if (!clerk_user_id || !email) {
        return res.status(400).json({
          error: "Missing required fields",
          message: "clerk_user_id and email are required",
        });
      }

      if (!["moderator", "admin"].includes(role)) {
        return res.status(400).json({
          error: "Invalid role",
          message: "Role must be 'moderator' or 'admin'",
        });
      }

      // Use helper function from middleware
      const { createAdminUser } = require("../middleware/adminAuth");
      const success = await createAdminUser(clerk_user_id, email, role);

      if (!success) {
        return res.status(500).json({
          error: "Failed to create admin user",
          message: "Database error occurred",
        });
      }

      // Log admin action
      console.log(
        `👤 Admin action: Admin user ${email} (${role}) created by ${req.clerkUserId}`
      );

      res.status(201).json({
        success: true,
        data: { clerk_user_id, email, role },
        message: "Admin user created successfully",
      });
    } catch (error) {
      console.error("Error creating admin user:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to create admin user",
      });
    }
  }
);

export default router;
