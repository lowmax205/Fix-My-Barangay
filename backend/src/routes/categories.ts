import { Router, Request, Response } from "express";
import { generalRateLimit } from "../middleware/rateLimiter";

const router = Router();

// Apply general rate limiting to all category routes
router.use(generalRateLimit);

// Report categories as defined in the database schema
export const REPORT_CATEGORIES = [
  {
    id: "Infrastructure",
    name: "Infrastructure",
    description: "Roads, bridges, sidewalks, public buildings",
    icon: "road", // For future UI use
    color: "#8B5CF6", // Purple
    examples: [
      "Potholes",
      "Broken streetlights",
      "Damaged roads",
      "Bridge repairs",
    ],
  },
  {
    id: "Sanitation",
    name: "Sanitation",
    description: "Waste management, cleanliness, drainage",
    icon: "trash", // For future UI use
    color: "#EF4444", // Red
    examples: [
      "Uncollected garbage",
      "Blocked drains",
      "Sewage issues",
      "Illegal dumping",
    ],
  },
  {
    id: "Safety",
    name: "Safety",
    description: "Public safety, security, dangerous conditions",
    icon: "shield", // For future UI use
    color: "#F59E0B", // Yellow
    examples: [
      "Broken fences",
      "Unsafe areas",
      "Missing signage",
      "Dangerous structures",
    ],
  },
  {
    id: "Water",
    name: "Water",
    description: "Water supply, leaks, flooding, water quality",
    icon: "droplet", // For future UI use
    color: "#06B6D4", // Cyan
    examples: [
      "Water leaks",
      "No water supply",
      "Flooding",
      "Contaminated water",
    ],
  },
  {
    id: "Electrical",
    name: "Electrical",
    description: "Power lines, electrical installations, outages",
    icon: "zap", // For future UI use
    color: "#10B981", // Green
    examples: [
      "Power outages",
      "Exposed wires",
      "Broken electrical posts",
      "Streetlight issues",
    ],
  },
];

// GET /api/v1/categories - Get all available report categories
router.get("/", async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        categories: REPORT_CATEGORIES,
        total: REPORT_CATEGORIES.length,
      },
      message: "Categories fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch categories",
    });
  }
});

// GET /api/v1/categories/:id - Get specific category details
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = REPORT_CATEGORIES.find((cat) => cat.id === id);

    if (!category) {
      return res.status(404).json({
        error: "Category not found",
        message: `Category with id '${id}' does not exist`,
      });
    }

    res.json({
      success: true,
      data: category,
      message: "Category fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch category",
    });
  }
});

export default router;
