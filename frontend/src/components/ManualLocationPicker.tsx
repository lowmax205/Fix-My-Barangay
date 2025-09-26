"use client";
import React, { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";

export interface ManualLocationPickerProps {
  onSelect: (location: { latitude: number; longitude: number }) => void;
  className?: string;
}

export const ManualLocationPicker: React.FC<ManualLocationPickerProps> = ({ onSelect, className }) => {
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [error, setError] = useState("");

  const validate = (value: number, type: "lat" | "lon") => {
    if (type === "lat") return value >= -90 && value <= 90;
    return value >= -180 && value <= 180;
  };

  const handleApply = () => {
    setError("");
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    if (isNaN(latNum) || isNaN(lonNum)) {
      setError("Latitude and longitude must be numbers");
      return;
    }
    if (!validate(latNum, "lat")) {
      setError("Latitude must be between -90 and 90");
      return;
    }
    if (!validate(lonNum, "lon")) {
      setError("Longitude must be between -180 and 180");
      return;
    }
    onSelect({ latitude: latNum, longitude: lonNum });
  };

  return (
    <div className={className} aria-labelledby="manual-location-heading">
      <h3 id="manual-location-heading" className="text-sm font-medium mb-2">Manual Coordinates</h3>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <Label htmlFor="manual-lat" className="text-xs">Latitude</Label>
          <Input
            id="manual-lat"
            inputMode="decimal"
            value={lat}
            placeholder="14.5995"
            onChange={(e) => setLat(e.target.value)}
            aria-invalid={!!error}
          />
        </div>
        <div>
          <Label htmlFor="manual-lon" className="text-xs">Longitude</Label>
            <Input
              id="manual-lon"
              inputMode="decimal"
              value={lon}
              placeholder="120.9842"
              onChange={(e) => setLon(e.target.value)}
              aria-invalid={!!error}
            />
        </div>
      </div>
      {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
      <Button type="button" size="sm" variant="outline" onClick={handleApply} className="mt-1 w-full">Apply Coordinates</Button>
    </div>
  );
};

export default ManualLocationPicker;
