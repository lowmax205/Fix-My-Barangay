// Geolocation hook providing permission management, one-time fetch, and watch capability
// Falls back gracefully if browser does not support geolocation.
import { useCallback, useEffect, useRef, useState } from "react";

export type GeolocationPermissionState =
  | "prompt"
  | "granted"
  | "denied"
  | "unsupported"
  | "unknown";

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number; // ms
  maximumAge?: number; // ms
  watch?: boolean; // start watch immediately
}

export interface UseGeolocationReturn {
  permission: GeolocationPermissionState;
  loading: boolean;
  error?: string;
  position?: GeoPosition;
  lastFetched?: number;
  isWatching: boolean;
  getCurrent: () => Promise<GeoPosition | null>;
  startWatch: () => void;
  stopWatch: () => void;
  clearError: () => void;
}

const DEFAULT_OPTIONS: Required<Omit<UseGeolocationOptions, "watch">> = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 300000,
};

export function useGeolocation(
  options: UseGeolocationOptions = {}
): UseGeolocationReturn {
  const merged = { ...DEFAULT_OPTIONS, ...options };
  const [permission, setPermission] =
    useState<GeolocationPermissionState>("unknown");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [position, setPosition] = useState<GeoPosition | undefined>();
  const [lastFetched, setLastFetched] = useState<number | undefined>();
  const [isWatching, setIsWatching] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  // Detect permission (if Permissions API available)
  useEffect(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setPermission("unsupported");
      return;
    }

    let aborted = false;

    async function checkPermission() {
      try {
        // Narrow to browsers supporting Permissions API
        if ("permissions" in navigator) {
          const navWithPerm = navigator as Navigator & {
            permissions: {
              query: (opts: {
                name: "geolocation";
              }) => Promise<{ state: string; onchange: (() => void) | null }>;
            };
          };
          const result = await navWithPerm.permissions.query({
            name: "geolocation",
          });
          if (!aborted) {
            setPermission(result.state as GeolocationPermissionState);
            // Listen for permission state changes if supported
            result.onchange = () => {
              setPermission(result.state as GeolocationPermissionState);
            };
          }
        } else {
          // Permissions API not available; default to prompt (legacy heuristic)
          setPermission("prompt");
        }
      } catch {
        setPermission("unknown");
      }
    }

    checkPermission();
    return () => {
      aborted = true;
    };
  }, []);

  const handleSuccess = useCallback((pos: GeolocationPosition) => {
    const coords: GeoPosition = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      timestamp: pos.timestamp,
    };
    setPosition(coords);
    setLastFetched(Date.now());
    setError(undefined);
    setLoading(false);
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    const message =
      err.code === err.PERMISSION_DENIED
        ? "Permission denied"
        : err.code === err.POSITION_UNAVAILABLE
        ? "Position unavailable"
        : err.code === err.TIMEOUT
        ? "Location request timed out"
        : "Unknown geolocation error";
    setError(message);
    setLoading(false);
  }, []);

  const getCurrent = useCallback(async (): Promise<GeoPosition | null> => {
    if (permission === "unsupported") return null;
    if (!("geolocation" in navigator)) return null;

    setLoading(true);
    setError(undefined);

    return new Promise<GeoPosition | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handleSuccess(pos);
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          });
        },
        (err) => {
          handleError(err);
          resolve(null);
        },
        {
          enableHighAccuracy: merged.enableHighAccuracy,
          timeout: merged.timeout,
          maximumAge: merged.maximumAge,
        }
      );
    });
  }, [
    permission,
    handleSuccess,
    handleError,
    merged.enableHighAccuracy,
    merged.timeout,
    merged.maximumAge,
  ]);

  const startWatch = useCallback(() => {
    if (isWatching) return;
    if (permission === "unsupported") return;
    if (!("geolocation" in navigator)) return;

    setIsWatching(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: merged.enableHighAccuracy,
        timeout: merged.timeout,
        maximumAge: merged.maximumAge,
      }
    );
  }, [
    isWatching,
    permission,
    handleSuccess,
    handleError,
    merged.enableHighAccuracy,
    merged.timeout,
    merged.maximumAge,
  ]);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsWatching(false);
  }, []);

  const clearError = () => setError(undefined);

  // Auto watch if option specified
  useEffect(() => {
    if (options.watch) {
      startWatch();
      return () => stopWatch();
    }
  }, [options.watch, startWatch, stopWatch]);

  return {
    permission,
    loading,
    error,
    position,
    lastFetched,
    isWatching,
    getCurrent,
    startWatch,
    stopWatch,
    clearError,
  };
}

export default useGeolocation;
