import { Router, Request, Response } from "express";
import { generalRateLimit } from "../middleware/rateLimiter";

const router = Router();

// Apply general rate limiting to all location routes
router.use(generalRateLimit);

// Location validation interface
interface LocationValidationRequest {
  latitude: number;
  longitude: number;
  address?: string;
}

interface LocationValidationResponse {
  isValid: boolean;
  withinServiceArea: boolean;
  suggestedAddress?: string;
  warnings?: string[];
  metadata: {
    coordinates: {
      latitude: number;
      longitude: number;
    };
    accuracy?: string;
    source: string;
  };
}

// Service area bounds - approximate bounds for Philippines/Surigao City
// These can be adjusted based on actual service coverage
const SERVICE_AREA_BOUNDS = {
  // Philippines approximate bounds
  north: 21.0,
  south: 5.0,
  east: 126.0,
  west: 117.0,

  // Surigao City more specific bounds (can be used for stricter validation)
  surigaoCity: {
    north: 9.8,
    south: 9.3,
    east: 125.5,
    west: 125.0,
  },
};

// Helper function to validate coordinate format
function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

// Helper function to check if coordinates are within service area
function isWithinServiceArea(lat: number, lng: number): boolean {
  // Check if within Philippines bounds
  const withinPhilippines =
    lat >= SERVICE_AREA_BOUNDS.south &&
    lat <= SERVICE_AREA_BOUNDS.north &&
    lng >= SERVICE_AREA_BOUNDS.west &&
    lng <= SERVICE_AREA_BOUNDS.east;

  return withinPhilippines;
}

// Helper function to check if coordinates are within Surigao City (more specific)
function isWithinsurigaoCity(lat: number, lng: number): boolean {
  const bounds = SERVICE_AREA_BOUNDS.surigaoCity;
  return (
    lat >= bounds.south &&
    lat <= bounds.north &&
    lng >= bounds.west &&
    lng <= bounds.east
  );
}

// Helper function to calculate distance between two points (simplified)
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// POST /api/v1/locations/validate - Validate location coordinates
router.post("/validate", async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, address }: LocationValidationRequest =
      req.body;

    // Validate request body
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        error: "Missing coordinates",
        message: "Both latitude and longitude are required",
      });
    }

    // Validate coordinate format
    if (!isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({
        error: "Invalid coordinates",
        message:
          "Latitude must be between -90 and 90, longitude must be between -180 and 180",
      });
    }

    // Check service area
    const withinServiceArea = isWithinServiceArea(latitude, longitude);
    const withinsurigaoCity = isWithinsurigaoCity(latitude, longitude);

    // Generate warnings
    const warnings: string[] = [];

    if (!withinServiceArea) {
      warnings.push("Location is outside the service area");
    } else if (!withinsurigaoCity) {
      warnings.push(
        "Location is outside Surigao City - response times may be longer"
      );
    }

    // Check for common invalid locations (ocean, etc.)
    if (latitude === 0 && longitude === 0) {
      warnings.push(
        "Coordinates appear to be at null island (0,0) - please verify location"
      );
    }

    // Determine accuracy based on decimal places
    const latDecimals = latitude.toString().split(".")[1]?.length || 0;
    const lngDecimals = longitude.toString().split(".")[1]?.length || 0;
    const avgDecimals = (latDecimals + lngDecimals) / 2;

    let accuracy = "low";
    if (avgDecimals >= 6) accuracy = "high";
    else if (avgDecimals >= 4) accuracy = "medium";

    // Create response
    const response: LocationValidationResponse = {
      isValid: withinServiceArea,
      withinServiceArea: withinServiceArea,
      warnings: warnings.length > 0 ? warnings : undefined,
      metadata: {
        coordinates: {
          latitude: latitude,
          longitude: longitude,
        },
        accuracy: accuracy,
        source: "client-provided",
      },
    };

    // If address is provided, we could add reverse geocoding here
    // For now, just acknowledge it
    if (address) {
      response.suggestedAddress = address;
      response.metadata.source = "client-provided-with-address";
    }

    res.json({
      success: true,
      data: response,
      message: "Location validation completed",
    });
  } catch (error) {
    console.error("Error validating location:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to validate location",
    });
  }
});

// GET /api/v1/locations/service-area - Get service area bounds
router.get("/service-area", async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        bounds: SERVICE_AREA_BOUNDS,
        coverage: {
          primary: "Surigao City",
          secondary: "Philippines",
          notes:
            "Primary coverage in Surigao City with extended support across Philippines",
        },
      },
      message: "Service area information retrieved",
    });
  } catch (error) {
    console.error("Error fetching service area:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch service area",
    });
  }
});

export default router;
