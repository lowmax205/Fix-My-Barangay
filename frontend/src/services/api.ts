import {
  Report,
  ReportSubmission,
  ReportsResponse,
  CategoriesResponse,
  LocationValidationResponse,
  ReportFilters,
  ApiResponse,
  Location,
  Category,
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Validate API URL on initialization
if (!API_BASE_URL || API_BASE_URL === "undefined") {
  console.error(
    "API_BASE_URL is not configured. Please check your environment variables."
  );
}

class ApiError extends Error {
  public status: number;
  public details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

// Generic API fetch wrapper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  // Check if API base URL is configured
  if (!API_BASE_URL || API_BASE_URL === "undefined") {
    throw new ApiError(
      "API configuration error: NEXT_PUBLIC_API_URL is not set",
      0,
      { configuration: "missing_api_url" }
    );
  }

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.text();
      let errorDetails: unknown;

      // Check if we received HTML instead of JSON (common 404 issue)
      if (
        errorData.includes("<!DOCTYPE html>") ||
        errorData.includes("<html")
      ) {
        const isNotFound = response.status === 404 || errorData.includes("404");
        const message = isNotFound
          ? `API endpoint not found: ${endpoint}. Check if the backend server is running and accessible.`
          : `Received HTML response instead of JSON from ${endpoint}. This usually indicates a routing or deployment issue.`;

        throw new ApiError(message, response.status, {
          type: "html_response",
          endpoint,
          receivedHtml: true,
        });
      }

      try {
        errorDetails = JSON.parse(errorData);
      } catch {
        errorDetails = { error: "Unknown error", message: errorData };
      }

      const message =
        (errorDetails as { message?: string } | null | undefined)?.message ||
        `HTTP ${response.status}`;
      throw new ApiError(message, response.status, errorDetails);
    }

    // Check content type to ensure we're getting JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const responseText = await response.text();
      throw new ApiError(
        `Expected JSON response but got ${
          contentType || "unknown content type"
        }`,
        response.status,
        { contentType, responseText: responseText.substring(0, 200) + "..." }
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Network or other errors
    throw new ApiError(
      error instanceof Error ? error.message : "Network error",
      0,
      { originalError: error }
    );
  }
}

// Reports API
export const reportsApi = {
  // Get reports with filtering
  async getReports(filters: ReportFilters = {}): Promise<ReportsResponse> {
    const searchParams = new URLSearchParams();

    if (filters.category) searchParams.set("category", filters.category);
    if (filters.status) searchParams.set("status", filters.status);
    if (filters.limit) searchParams.set("limit", filters.limit.toString());
    if (filters.offset) searchParams.set("offset", filters.offset.toString());

    const endpoint = `/api/v1/reports${
      searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`;
    const response = await apiRequest<ReportsResponse>(endpoint);
    return response.data;
  },

  // Get specific report by ID
  async getReport(id: string): Promise<Report> {
    const response = await apiRequest<Report>(`/api/v1/reports/${id}`);
    return response.data;
  },

  // Submit new report
  async submitReport(reportData: ReportSubmission): Promise<Report> {
    const response = await apiRequest<Report>("/api/v1/reports", {
      method: "POST",
      body: JSON.stringify(reportData),
    });
    return response.data;
  },
};

// Fallback categories for offline or error cases
export const FALLBACK_CATEGORIES = [
  {
    id: "Infrastructure",
    name: "Infrastructure",
    description: "Roads, bridges, sidewalks, public buildings",
    icon: "road",
    color: "#8B5CF6",
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
    icon: "trash",
    color: "#EF4444",
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
    icon: "shield",
    color: "#F59E0B",
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
    icon: "droplet",
    color: "#06B6D4",
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
    icon: "zap",
    color: "#10B981",
    examples: [
      "Power outages",
      "Exposed wires",
      "Broken electrical posts",
      "Streetlight issues",
    ],
  },
];

// Categories API
export const categoriesApi = {
  // Get all categories
  async getCategories(): Promise<CategoriesResponse> {
    try {
      const response = await apiRequest<CategoriesResponse>("/api/v1/categories");
      return response.data;
    } catch (error) {
      console.warn(
        "Failed to fetch categories from API, using fallback data:",
        error
      );

      // Return fallback categories with the expected structure
      return {
        categories: FALLBACK_CATEGORIES,
        total: FALLBACK_CATEGORIES.length,
      };
    }
  },

  // Get specific category
  async getCategory(id: string): Promise<Category> {
    try {
      const response = await apiRequest<Category>(`/api/v1/categories/${id}`);
      return response.data;
    } catch (error) {
      console.warn(
        `Failed to fetch category ${id} from API, using fallback data:`,
        error
      );

      // Find in fallback data
      const category = FALLBACK_CATEGORIES.find((cat) => cat.id === id);
      if (!category) {
        throw new ApiError(`Category '${id}' not found`, 404);
      }
      return category;
    }
  },
};

// Location API
export const locationApi = {
  // Validate location coordinates
  async validateLocation(
    location: Location,
    address?: string
  ): Promise<LocationValidationResponse> {
    const response = await apiRequest<LocationValidationResponse>(
      "/api/v1/locations/validate",
      {
        method: "POST",
        body: JSON.stringify({ ...location, address }),
      }
    );
    return response.data;
  },

  // Get service area bounds
  async getServiceArea(): Promise<Record<string, unknown>> {
    const response = await apiRequest<Record<string, unknown>>(
      "/api/v1/locations/service-area"
    );
    return response.data;
  },
};

// Export the ApiError for use in components
export { ApiError };
