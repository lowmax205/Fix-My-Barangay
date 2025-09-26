import { query } from "../db/connection";
import { Location } from "../models/Report";

export interface PotentialDuplicate {
  id: string;
  description: string;
  distance_m: number;
  created_at: string;
}

// Simple distance calc (Haversine) in meters
function haversine(a: Location, b: Location) {
  const R = 6371000; // m
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

export async function findPotentialDuplicates(
  location: Location,
  radiusMeters = 120,
  recentHours = 24
): Promise<PotentialDuplicate[]> {
  const result = await query(
    `SELECT id, description, ST_Y(location) as latitude, ST_X(location) as longitude, created_at
     FROM reports
     WHERE created_at > NOW() - ($1 || ' hours')::interval`,
    [recentHours]
  );
  const current = location;
  const candidates: PotentialDuplicate[] = [];
  for (const row of result.rows) {
    const dist = haversine(current, {
      latitude: row.latitude,
      longitude: row.longitude,
    });
    if (dist <= radiusMeters) {
      candidates.push({
        id: row.id,
        description: row.description,
        distance_m: Math.round(dist),
        created_at: row.created_at,
      });
    }
  }
  // Return up to 5 closest
  candidates.sort((a, b) => a.distance_m - b.distance_m);
  return candidates.slice(0, 5);
}
