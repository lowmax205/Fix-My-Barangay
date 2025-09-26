-- Migration: Convert reports.location from POINT to geometry(Point,4326)
-- Date: 2025-09-26

-- Ensure postgis exists (safe if repeated)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Convert reports.location to geometry(Point,4326) only if currently a built-in point type
DO $$
DECLARE
    is_builtin_point boolean;
BEGIN
    SELECT (t.typname = 'point') INTO is_builtin_point
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_type t ON t.oid = a.atttypid
    WHERE c.relname = 'reports' AND a.attname = 'location';

    IF is_builtin_point THEN
        -- Drop dependent index if exists
        IF EXISTS (
            SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_reports_location'
        ) THEN
            EXECUTE 'DROP INDEX IF EXISTS idx_reports_location';
        END IF;

        -- Add new geometry column
        ALTER TABLE reports ADD COLUMN location_geom geometry(Point, 4326);

        -- Copy data point(x,y) to geometry
        UPDATE reports
        SET location_geom = ST_SetSRID(ST_Point(
            (location)[0]::double precision,
            (location)[1]::double precision
        ), 4326);

        -- Replace columns
        ALTER TABLE reports DROP COLUMN location;
        ALTER TABLE reports RENAME COLUMN location_geom TO location;

        -- Recreate index
        CREATE INDEX IF NOT EXISTS idx_reports_location ON reports USING GIST(location);
    END IF;
END $$;
