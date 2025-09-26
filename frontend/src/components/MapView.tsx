'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MapPin, 
  ZoomIn, 
  ZoomOut, 
  Locate, 
  Layers,
  AlertTriangle,
  Clock,
  CheckCircle
} from 'lucide-react';
import { Report, Location } from '@/types';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set Mapbox access token from environment
const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

if (!MAPBOX_ACCESS_TOKEN) {
  console.error('NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN environment variable is required for map functionality');
}

interface MapViewProps {
  reports?: Report[];
  center?: Location;
  zoom?: number;
  onReportClick?: (report: Report) => void;
  onMapClick?: (location: Location) => void;
  className?: string;
  showUserLocation?: boolean;
  interactive?: boolean;
  onViewportChange?: (viewport: { latitude: number; longitude: number; zoom: number }) => void;
}

export default function MapView({
  reports = [],
  center = { latitude: 9.7587, longitude: 125.5135 }, // Default to Surigao City
  zoom = 12,
  onReportClick,
  onMapClick,
  className = '',
  showUserLocation = true,
  interactive = true,
  onViewportChange
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const userLocationMarker = useRef<mapboxgl.Marker | null>(null);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string>('');
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  // Track viewport internally without triggering unused state warnings
  const viewportRef = useRef<{ latitude: number; longitude: number; zoom: number }>({
    latitude: center.latitude,
    longitude: center.longitude,
    zoom: zoom
  });
  
  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    if (!MAPBOX_ACCESS_TOKEN) {
      setError('Mapbox access token is required. Please check your environment configuration.');
      return;
    }

    try {
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [center.longitude, center.latitude],
        zoom: zoom,
        interactive: interactive,
        attributionControl: false
      });

      // Add navigation controls if interactive
      if (interactive) {
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      }

      // Add custom attribution
      map.current.addControl(
        new mapboxgl.AttributionControl({
          customAttribution: 'Fix My Barangay'
        }),
        'bottom-right'
      );

      // Map event handlers
      map.current.on('load', () => {
        setIsLoaded(true);
      });

      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        setError('Failed to load map. Please check your internet connection.');
      });

      if (onMapClick) {
        map.current.on('click', (e) => {
          const { lng, lat } = e.lngLat;
          onMapClick({ latitude: lat, longitude: lng });
        });
      }
      
      // Track viewport changes
      const updateViewport = () => {
        if (map.current) {
          const { lng, lat } = map.current.getCenter();
          const vp = { latitude: lat, longitude: lng, zoom: map.current.getZoom() };
          viewportRef.current = vp;
          onViewportChange?.(vp);
        }
      };

      map.current.on('moveend', updateViewport);
      map.current.on('zoomend', updateViewport);

    } catch (err) {
      console.error('Failed to initialize map:', err);
      setError('Failed to initialize map. Please check your Mapbox configuration.');
    }

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [center.latitude, center.longitude, zoom, interactive, onMapClick, onViewportChange]);

  // Get user location
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setUserLocation(location);
        
        if (map.current) {
          map.current.flyTo({
            center: [location.longitude, location.latitude],
            zoom: 15
          });
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError('Failed to get your location. Please enable location access.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  }, []);

  // Get user location on mount if requested
  useEffect(() => {
    if (showUserLocation && isLoaded) {
      getUserLocation();
    }
  }, [showUserLocation, isLoaded, getUserLocation]);

  // Update user location marker
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    if (userLocationMarker.current) {
      userLocationMarker.current.remove();
      userLocationMarker.current = null;
    }

    if (userLocation) {
      // Create custom user location marker
      const userMarkerElement = document.createElement('div');
      userMarkerElement.className = 'user-location-marker';
      userMarkerElement.style.cssText = `
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #3b82f6;
        border: 3px solid white;
        box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        cursor: pointer;
      `;

      userLocationMarker.current = new mapboxgl.Marker(userMarkerElement)
        .setLngLat([userLocation.longitude, userLocation.latitude])
        .addTo(map.current);
    }
  }, [userLocation, isLoaded]);

  // Get marker color based on report status
  const getMarkerColor = (report: Report) => {
    const colors = {
      'Submitted': '#3b82f6',      // blue
      'In Review': '#f59e0b',      // amber
      'In Progress': '#f97316',    // orange
      'Resolved': '#10b981',       // green
      'Closed': '#6b7280'          // gray
    };
    return colors[report.status] || colors['Submitted'];
  };

  // Get marker icon based on report category
  const getMarkerIcon = (report: Report) => {
    const icons = {
      'Infrastructure': '🚧',
      'Sanitation': '🗑️',
      'Safety': '⚠️',
      'Water': '💧',
      'Electrical': '⚡'
    };
    return icons[report.category] || '📍';
  };

  // Update report markers
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Add markers for each report
    reports.forEach(report => {
      const markerColor = getMarkerColor(report);
      const markerIcon = getMarkerIcon(report);

      // Create custom marker element
      const markerElement = document.createElement('div');
      markerElement.className = 'report-marker';
      markerElement.innerHTML = `
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: ${markerColor};
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          cursor: pointer;
          transition: transform 0.2s;
        " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">${markerIcon}</div>
      `;

      // Create popup content
      const popupContent = `
        <div class="p-3 max-w-sm">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-3 h-3 rounded-full" style="background: ${markerColor}"></div>
            <span class="font-medium text-sm">${report.category}</span>
            <span class="px-2 py-1 text-xs bg-gray-100 rounded">${report.status}</span>
          </div>
          <p class="text-sm mb-2 line-clamp-2">${report.description}</p>
          <div class="flex items-center justify-between text-xs text-gray-600">
            <span>${report.address || 'No address provided'}</span>
            <button class="text-blue-600 hover:text-blue-800 font-medium">View Details</button>
          </div>
        </div>
      `;

      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: true
      }).setHTML(popupContent);

      const marker = new mapboxgl.Marker(markerElement)
        .setLngLat([report.location.longitude, report.location.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      // Handle marker click
      markerElement.addEventListener('click', (e) => {
        e.stopPropagation();
        onReportClick?.(report);
      });

      markers.current.push(marker);
    });

    // Fit map to show all markers if there are reports
    if (reports.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      
      reports.forEach(report => {
        bounds.extend([report.location.longitude, report.location.latitude]);
      });

      // Add user location to bounds if available
      if (userLocation) {
        bounds.extend([userLocation.longitude, userLocation.latitude]);
      }

      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15
      });
    }
  }, [reports, isLoaded, onReportClick, userLocation]);

  // Map control functions
  const zoomIn = () => {
    if (map.current) {
      map.current.zoomIn();
    }
  };

  const zoomOut = () => {
    if (map.current) {
      map.current.zoomOut();
    }
  };

  const toggleLayer = () => {
    if (map.current) {
      const currentStyle = map.current.getStyle().name;
      const newStyle = currentStyle === 'Mapbox Streets' 
        ? 'mapbox://styles/mapbox/satellite-v9'
        : 'mapbox://styles/mapbox/streets-v11';
      map.current.setStyle(newStyle);
    }
  };

  if (!MAPBOX_ACCESS_TOKEN) {
    return (
      <Card className={`h-96 ${className}`}>
        <CardContent className="flex items-center justify-center h-full">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Mapbox access token is required. Please configure your environment variables.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="relative">
        {/* Map Container */}
        <div 
          ref={mapContainer} 
          className="h-96 w-full rounded-lg border"
          style={{ minHeight: '400px' }}
        />

        {/* Loading Overlay */}
        {!isLoaded && !error && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        )}

        {/* Map Controls */}
        {isLoaded && interactive && (
          <div className="absolute top-4 left-4 space-y-2">
            <div className="bg-white rounded-lg shadow-md p-1 space-y-1">
              <Button size="sm" variant="ghost" onClick={zoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={zoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={getUserLocation}>
                <Locate className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={toggleLayer}>
                <Layers className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Map Legend */}
        {reports.length > 0 && (
          <div className="absolute bottom-14 left-4 bg-white rounded-lg shadow-md p-3 max-w-xs">
            <h4 className="font-medium text-sm mb-2">Report Status</h4>
            <div className="space-y-1">
              {[
                { status: 'Submitted', color: '#3b82f6', icon: <Clock className="h-3 w-3" /> },
                { status: 'In Review', color: '#f59e0b', icon: <Clock className="h-3 w-3" /> },
                { status: 'In Progress', color: '#f97316', icon: <Clock className="h-3 w-3" /> },
                { status: 'Resolved', color: '#10b981', icon: <CheckCircle className="h-3 w-3" /> },
                { status: 'Closed', color: '#6b7280', icon: <CheckCircle className="h-3 w-3" /> }
              ].map(({ status, color, icon }) => (
                <div key={status} className="flex items-center gap-2 text-xs">
                  <div 
                    className="w-3 h-3 rounded-full border border-white shadow-sm" 
                    style={{ backgroundColor: color }}
                  />
                  <span className="flex items-center gap-1">
                    {icon}
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reports Count */}
        {reports.length > 0 && (
          <div className="absolute top-4 right-12">
            <Badge variant="secondary" className="shadow-md">
              <MapPin className="h-3 w-3 mr-1" />
              {reports.length} report{reports.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}