// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// Location Types
export interface Location {
  latitude: number;
  longitude: number;
}

export interface LocationValidationResponse {
  isValid: boolean;
  withinServiceArea: boolean;
  suggestedAddress?: string;
  warnings?: string[];
  metadata: {
    coordinates: Location;
    accuracy?: string;
    source: string;
  };
}

// Report Types
export type ReportCategory =
  | "Infrastructure"
  | "Sanitation"
  | "Safety"
  | "Water"
  | "Electrical";
export type ReportStatus =
  | "Submitted"
  | "In Review"
  | "In Progress"
  | "Resolved"
  | "Closed";

export interface Report {
  id: string;
  category: ReportCategory;
  description: string;
  location: Location;
  address?: string;
  photo_url?: string;
  photo_public_id?: string;
  status: ReportStatus;
  reporter_ip?: string;
  admin_notes?: string;
  duplicate_of?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface ReportSubmission {
  category: ReportCategory;
  description: string;
  location: Location;
  address?: string;
  photo?: File | string;
  photo_url?: string;
  photo_public_id?: string;
}

export interface ReportsResponse {
  reports: Report[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  maxLimit?: number;
  limitRequested?: number;
  limitApplied?: number;
}

// Category Types
export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  examples: string[];
}

export interface CategoriesResponse {
  categories: Category[];
  total: number;
}

// Filter Types
export interface ReportFilters {
  category?: ReportCategory;
  status?: ReportStatus;
  limit?: number;
  offset?: number;
}

// Form Types
export interface ReportFormData {
  category: ReportCategory;
  description: string;
  location?: Location;
  address?: string;
  photo?: File;
}

// Map Types
export interface MapViewport {
  latitude: number;
  longitude: number;
  zoom: number;
}

// Error Types
export interface ApiErrorDetails {
  error: string;
  message: string;
  details?: unknown;
}
