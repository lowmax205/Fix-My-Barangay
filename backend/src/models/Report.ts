import { query } from "../db/connection";

// Report status enum
export type ReportStatus =
  | "Submitted"
  | "In Review"
  | "In Progress"
  | "Resolved"
  | "Closed";

// Report category enum
export type ReportCategory =
  | "Infrastructure"
  | "Sanitation"
  | "Safety"
  | "Water"
  | "Electrical";

// Location interface for PostGIS Point
export interface Location {
  latitude: number;
  longitude: number;
}

// Report interface
export interface Report {
  id: string;
  category: ReportCategory;
  description: string;
  location: Location;
  address?: string;
  photo_url?: string;
  photo_public_id?: string;
  status: ReportStatus;
  reporter_ip: string;
  admin_notes?: string;
  duplicate_of?: string;
  created_at: Date;
  updated_at: Date;
  resolved_at?: Date;
}

// Create report input interface
export interface CreateReportInput {
  category: ReportCategory;
  description: string;
  location: Location;
  address?: string;
  photo_url?: string;
  photo_public_id?: string;
  reporter_ip: string;
}

// Update report input interface
export interface UpdateReportInput {
  status?: ReportStatus;
  admin_notes?: string;
  duplicate_of?: string;
  resolved_at?: Date;
}

// Report filter interface
export interface ReportFilter {
  category?: ReportCategory;
  status?: ReportStatus;
  limit?: number;
  offset?: number;
}

// Validation functions
export function validateReportCategory(
  category: string
): category is ReportCategory {
  return [
    "Infrastructure",
    "Sanitation",
    "Safety",
    "Water",
    "Electrical",
  ].includes(category);
}

export function validateReportStatus(status: string): status is ReportStatus {
  return [
    "Submitted",
    "In Review",
    "In Progress",
    "Resolved",
    "Closed",
  ].includes(status);
}

export function validateDescription(description: string): boolean {
  return description.length >= 1 && description.length <= 500;
}

export function validateLocation(location: Location): boolean {
  return (
    typeof location.latitude === "number" &&
    typeof location.longitude === "number" &&
    location.latitude >= -90 &&
    location.latitude <= 90 &&
    location.longitude >= -180 &&
    location.longitude <= 180
  );
}

// Validate location specifically for Philippines (enforced by database constraint)
export function validatePhilippinesLocation(location: Location): boolean {
  return (
    validateLocation(location) &&
    location.latitude >= 4.0 &&
    location.latitude <= 21.0 &&
    location.longitude >= 116.0 &&
    location.longitude <= 127.0
  );
}

// Validate location specifically for Surigao City area (optional strict validation)
export function validateSurigaoCityLocation(location: Location): boolean {
  return (
    validatePhilippinesLocation(location) &&
    location.latitude >= 9.6 && // Surigao City area bounds
    location.latitude <= 9.9 &&
    location.longitude >= 125.3 &&
    location.longitude <= 125.6
  );
}

// Database operations
export class ReportModel {
  // Create a new report
  static async create(data: CreateReportInput): Promise<Report> {
    const result = await query(
      `
      INSERT INTO reports (category, description, location, address, photo_url, photo_public_id, reporter_ip)
      VALUES ($1, $2, ST_SetSRID(ST_Point($3, $4), 4326), $5, $6, $7, $8)
      RETURNING id, category, description, 
                ST_X(location) as longitude, ST_Y(location) as latitude,
                address, photo_url, photo_public_id, status, reporter_ip, admin_notes, 
                duplicate_of, created_at, updated_at, resolved_at
    `,
      [
        data.category,
        data.description,
        data.location.longitude,
        data.location.latitude,
        data.address,
        data.photo_url,
        data.photo_public_id,
        data.reporter_ip,
      ]
    );

    const row = result.rows[0];
    return {
      ...row,
      location: { latitude: row.latitude, longitude: row.longitude },
    };
  }

  // Find report by ID
  static async findById(id: string): Promise<Report | null> {
    const result = await query(
      `
      SELECT id, category, description, 
             ST_X(location) as longitude, ST_Y(location) as latitude,
             address, photo_url, photo_public_id, status, reporter_ip, admin_notes,
             duplicate_of, created_at, updated_at, resolved_at
      FROM reports WHERE id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...row,
      location: { latitude: row.latitude, longitude: row.longitude },
    };
  }

  // Find reports with filtering
  static async findMany(
    filter: ReportFilter = {}
  ): Promise<{ reports: Report[]; total: number }> {
    let whereClause = "WHERE 1=1";
    const params: any[] = [];

    if (filter.category) {
      params.push(filter.category);
      whereClause += ` AND category = $${params.length}`;
    }

    if (filter.status) {
      params.push(filter.status);
      whereClause += ` AND status = $${params.length}`;
    }

    // Count total matching records
    const countResult = await query(
      `SELECT COUNT(*) as total FROM reports ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const limit = filter.limit || 20;
    const offset = filter.offset || 0;

    // Add limit and offset parameters
    const limitIndex = params.length + 1;
    const offsetIndex = params.length + 2;
    params.push(limit, offset);

    const result = await query(
      `
      SELECT id, category, description, 
             ST_X(location) as longitude, ST_Y(location) as latitude,
             address, photo_url, photo_public_id, status, reporter_ip, admin_notes,
             duplicate_of, created_at, updated_at, resolved_at
      FROM reports ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `,
      params
    );

    const reports = result.rows.map((row) => ({
      ...row,
      location: { latitude: row.latitude, longitude: row.longitude },
    }));

    return { reports, total };
  }

  // Update report
  static async update(
    id: string,
    data: UpdateReportInput
  ): Promise<Report | null> {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.status) {
      params.push(data.status);
      updates.push(`status = $${params.length}`);
    }

    if (data.admin_notes !== undefined) {
      params.push(data.admin_notes);
      updates.push(`admin_notes = $${params.length}`);
    }

    if (data.duplicate_of !== undefined) {
      params.push(data.duplicate_of);
      updates.push(`duplicate_of = $${params.length}`);
    }

    if (data.resolved_at !== undefined) {
      params.push(data.resolved_at);
      updates.push(`resolved_at = $${params.length}`);
    }

    if (updates.length === 0) {
      throw new Error("No fields to update");
    }

    params.push(id);
    const result = await query(
      `
      UPDATE reports 
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE id = $${params.length}
      RETURNING id, category, description, 
                ST_X(location) as longitude, ST_Y(location) as latitude,
                address, photo_url, photo_public_id, status, reporter_ip, admin_notes,
                duplicate_of, created_at, updated_at, resolved_at
    `,
      params
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...row,
      location: { latitude: row.latitude, longitude: row.longitude },
    };
  }

  // Find nearby reports for duplicate detection (optimized for Surigao City)
  static async findNearby(
    location: Location,
    radiusMeters: number = 100
  ): Promise<Report[]> {
    const result = await query(
      `
      SELECT id, category, description, 
             ST_X(location) as longitude, ST_Y(location) as latitude,
             address, photo_url, photo_public_id, status, reporter_ip, admin_notes,
             duplicate_of, created_at, updated_at, resolved_at,
             ST_Distance(
               location::geography,
               ST_SetSRID(ST_Point($1, $2), 4326)::geography
             ) as distance_meters
      FROM reports
      WHERE ST_DWithin(
        location::geography,
        ST_SetSRID(ST_Point($1, $2), 4326)::geography,
        $3
      )
      ORDER BY distance_meters
    `,
      [location.longitude, location.latitude, radiusMeters]
    );

    return result.rows.map((row) => ({
      ...row,
      location: { latitude: row.latitude, longitude: row.longitude },
    }));
  }

  // Find reports within Surigao City bounds
  static async findInSurigaoCity(): Promise<Report[]> {
    // Surigao City approximate bounds
    const surigaoBounds = {
      north: 9.9,
      south: 9.6,
      east: 125.6,
      west: 125.3,
    };

    const result = await query(
      `
      SELECT id, category, description, 
             ST_X(location) as longitude, ST_Y(location) as latitude,
             address, photo_url, photo_public_id, status, reporter_ip, admin_notes,
             duplicate_of, created_at, updated_at, resolved_at
      FROM reports
      WHERE ST_X(location) BETWEEN $1 AND $2 
        AND ST_Y(location) BETWEEN $3 AND $4
      ORDER BY created_at DESC
    `,
      [
        surigaoBounds.west,
        surigaoBounds.east,
        surigaoBounds.south,
        surigaoBounds.north,
      ]
    );

    return result.rows.map((row) => ({
      ...row,
      location: { latitude: row.latitude, longitude: row.longitude },
    }));
  }

  // Delete report (admin only)
  static async delete(id: string): Promise<boolean> {
    try {
      const result = await query("DELETE FROM reports WHERE id = $1", [id]);
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error("Error deleting report:", error);
      return false;
    }
  }
}
