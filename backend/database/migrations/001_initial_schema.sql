-- Migration: Initial schema setup
-- Date: 2025-09-23
-- Description: Create initial tables for Fix My Barangay

BEGIN;

-- Enable PostGIS extension for geospatial data
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Reports table - Core entity for civic issue reporting
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL CHECK (category IN ('Infrastructure', 'Sanitation', 'Safety', 'Water', 'Electrical')),
    description TEXT NOT NULL CHECK (length(description) <= 500 AND length(description) >= 1),
    location POINT NOT NULL,
    address TEXT,
    photo_url TEXT,
    photo_public_id TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'In Review', 'In Progress', 'Resolved', 'Closed')),
    reporter_ip INET NOT NULL,
    admin_notes TEXT,
    duplicate_of UUID REFERENCES reports(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
    ip_address INET PRIMARY KEY,
    hourly_count INTEGER DEFAULT 0,
    daily_count INTEGER DEFAULT 0,
    last_hourly_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_daily_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
    clerk_user_id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL DEFAULT 'moderator' CHECK (role IN ('moderator', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

COMMIT;