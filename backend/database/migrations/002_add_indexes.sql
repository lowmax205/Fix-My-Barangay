-- Migration: Create indexes for performance
-- Date: 2025-09-23
-- Description: Add indexes for better query performance

BEGIN;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
CREATE INDEX IF NOT EXISTS idx_reports_location ON reports USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_ip ON reports(reporter_ip);
CREATE INDEX IF NOT EXISTS idx_rate_limits_hourly_reset ON rate_limits(last_hourly_reset);
CREATE INDEX IF NOT EXISTS idx_rate_limits_daily_reset ON rate_limits(last_daily_reset);

COMMIT;