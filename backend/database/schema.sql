-- Fix My Barangay Database Schema
-- Requires PostgreSQL with PostGIS extension

-- Enable PostGIS extension for geospatial data
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    category VARCHAR(50) NOT NULL CHECK (
        category IN (
            'Infrastructure',
            'Sanitation',
            'Safety',
            'Water',
            'Electrical'
        )
    ),
    description TEXT NOT NULL CHECK (
        length(description) <= 500
        AND length(description) >= 1
    ),
    -- Store geospatial point as PostGIS geometry with SRID 4326 (lon/lat)
    location geometry(Point, 4326) NOT NULL,
    address TEXT, -- Optional human-readable address
    photo_url TEXT, -- Cloudinary URL
    photo_public_id TEXT, -- Cloudinary public ID for management
    status VARCHAR(20) NOT NULL DEFAULT 'Submitted' CHECK (
        status IN (
            'Submitted',
            'In Review',
            'In Progress',
            'Resolved',
            'Closed'
        )
    ),
    reporter_ip INET NOT NULL, -- For rate limiting
    admin_notes TEXT, -- Internal notes from officials
    duplicate_of UUID REFERENCES reports (id), -- For duplicate handling
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        resolved_at TIMESTAMP
    WITH
        TIME ZONE
);

-- Rate limiting table - Track submission limits per IP
CREATE TABLE rate_limits (
    ip_address INET PRIMARY KEY,
    hourly_count INTEGER DEFAULT 0,
    daily_count INTEGER DEFAULT 0,
    last_hourly_reset TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        last_daily_reset TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

-- Admin users table - Managed by Clerk authentication
CREATE TABLE admin_users (
    clerk_user_id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL DEFAULT 'moderator' CHECK (
        role IN ('moderator', 'admin')
    ),
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        last_login TIMESTAMP
    WITH
        TIME ZONE
);

-- Performance indexes
CREATE INDEX idx_reports_category ON reports (category);

CREATE INDEX idx_reports_status ON reports (status);

CREATE INDEX idx_reports_created_at ON reports (created_at);

CREATE INDEX idx_reports_location ON reports USING GIST (location);

CREATE INDEX idx_reports_reporter_ip ON reports (reporter_ip);

CREATE INDEX idx_rate_limits_hourly_reset ON rate_limits (last_hourly_reset);

CREATE INDEX idx_rate_limits_daily_reset ON rate_limits (last_daily_reset);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reports_updated_at 
    BEFORE UPDATE ON reports 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Sample categories for reference (as comments)
-- Infrastructure: Roads, bridges, streetlights, sidewalks
-- Sanitation: Garbage collection, littering, cleaning
-- Safety: Crime, accidents, hazards
-- Water: Supply issues, leaks, flooding
-- Electrical: Power outages, damaged lines