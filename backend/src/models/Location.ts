// Location types and validation for PostGIS integration

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationData extends Coordinates {
  address?: string;
  accuracy?: number; // GPS accuracy in meters
  timestamp?: Date;
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

// Philippines bounding box for validation
export const PHILIPPINES_BOUNDS: BoundingBox = {
  north: 21.5, // Northernmost point
  south: 4.5, // Southernmost point
  east: 126.6, // Easternmost point
  west: 116.9, // Westernmost point
};

// Location validation utilities
export class LocationValidator {
  // Validate latitude/longitude coordinates
  static validateCoordinates(
    lat: number,
    lng: number
  ): { isValid: boolean; error?: string } {
    if (typeof lat !== "number" || typeof lng !== "number") {
      return {
        isValid: false,
        error: "Latitude and longitude must be numbers",
      };
    }

    if (isNaN(lat) || isNaN(lng)) {
      return { isValid: false, error: "Latitude and longitude cannot be NaN" };
    }

    if (lat < -90 || lat > 90) {
      return { isValid: false, error: "Latitude must be between -90 and 90" };
    }

    if (lng < -180 || lng > 180) {
      return {
        isValid: false,
        error: "Longitude must be between -180 and 180",
      };
    }

    return { isValid: true };
  }

  // Validate if coordinates are within Philippines bounds
  static isWithinPhilippines(lat: number, lng: number): boolean {
    return (
      lat >= PHILIPPINES_BOUNDS.south &&
      lat <= PHILIPPINES_BOUNDS.north &&
      lng >= PHILIPPINES_BOUNDS.west &&
      lng <= PHILIPPINES_BOUNDS.east
    );
  }

  // Validate location object
  static validateLocation(location: any): {
    isValid: boolean;
    location?: Coordinates;
    error?: string;
  } {
    if (!location || typeof location !== "object") {
      return { isValid: false, error: "Location must be an object" };
    }

    const { latitude, longitude } = location;

    const coordValidation = this.validateCoordinates(latitude, longitude);
    if (!coordValidation.isValid) {
      return coordValidation;
    }

    if (!this.isWithinPhilippines(latitude, longitude)) {
      return {
        isValid: false,
        error: "Location must be within Philippines boundaries",
      };
    }

    return {
      isValid: true,
      location: { latitude, longitude },
    };
  }
}

// Distance calculations
export class LocationUtils {
  // Calculate distance between two points using Haversine formula
  static calculateDistance(point1: Coordinates, point2: Coordinates): number {
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = (point1.latitude * Math.PI) / 180;
    const lat2Rad = (point2.latitude * Math.PI) / 180;
    const deltaLatRad = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const deltaLngRad = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) *
        Math.cos(lat2Rad) *
        Math.sin(deltaLngRad / 2) *
        Math.sin(deltaLngRad / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  // Check if two locations are within specified distance
  static areLocationsNearby(
    point1: Coordinates,
    point2: Coordinates,
    maxDistanceMeters: number
  ): boolean {
    const distance = this.calculateDistance(point1, point2);
    return distance <= maxDistanceMeters;
  }

  // Convert coordinates to PostGIS Point format for SQL
  static toPostGISPoint(location: Coordinates): string {
    return `ST_MakePoint(${location.longitude}, ${location.latitude})`;
  }

  // Format coordinates for display (6 decimal places)
  static formatCoordinates(location: Coordinates): string {
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  }

  // Generate bounding box for nearby search
  static getBoundingBox(
    center: Coordinates,
    radiusMeters: number
  ): BoundingBox {
    const lat = center.latitude;
    const lng = center.longitude;

    // Approximate degrees per meter (varies by latitude)
    const latDegreesPerMeter = 1 / 111320;
    const lngDegreesPerMeter = 1 / (111320 * Math.cos((lat * Math.PI) / 180));

    const latDelta = radiusMeters * latDegreesPerMeter;
    const lngDelta = radiusMeters * lngDegreesPerMeter;

    return {
      north: lat + latDelta,
      south: lat - latDelta,
      east: lng + lngDelta,
      west: lng - lngDelta,
    };
  }
}

// Address geocoding utilities (for future Mapbox integration)
export interface GeocodingResult {
  coordinates: Coordinates;
  formatted_address: string;
  place_name: string;
  confidence: number;
}

export class AddressGeocoder {
  // Placeholder for Mapbox geocoding integration
  static async geocodeAddress(
    address: string
  ): Promise<GeocodingResult | null> {
    // TODO: Implement Mapbox geocoding API call
    // This would be implemented in the frontend service
    throw new Error("Geocoding should be handled by Mapbox service");
  }

  // Placeholder for reverse geocoding
  static async reverseGeocode(location: Coordinates): Promise<string | null> {
    // TODO: Implement Mapbox reverse geocoding API call
    // This would be implemented in the frontend service
    throw new Error("Reverse geocoding should be handled by Mapbox service");
  }
}
