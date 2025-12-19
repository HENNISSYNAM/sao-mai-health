import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { cn } from '@/lib/utils';
import type { EnvironmentData, RiskAssessment } from '@/hooks/useStrokeRiskEngine';
import 'leaflet/dist/leaflet.css';

interface FullScreenMapProps {
  gps: { lat: number; lon: number } | null;
  environment: EnvironmentData;
  riskAssessment: RiskAssessment;
  isBlurred?: boolean;
  className?: string;
}

// Custom user location marker
const userLocationIcon = L.divIcon({
  className: 'user-location-marker',
  html: `
    <div class="relative">
      <div class="w-6 h-6 bg-info rounded-full border-3 border-white shadow-lg flex items-center justify-center animate-pulse">
        <div class="w-2 h-2 bg-white rounded-full"></div>
      </div>
      <div class="absolute -inset-2 bg-info/30 rounded-full animate-ping"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// Map controller for centering on user
function MapController({ gps }: { gps: { lat: number; lon: number } | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (gps) {
      map.setView([gps.lat, gps.lon], 13, { animate: true, duration: 1 });
    }
  }, [gps, map]);
  
  return null;
}

const FullScreenMap: React.FC<FullScreenMapProps> = ({
  gps,
  environment,
  riskAssessment,
  isBlurred = false,
  className
}) => {
  const [mapReady, setMapReady] = useState(false);

  // Default center (HCMC)
  const defaultCenter: [number, number] = [10.7769, 106.7009];
  const center: [number, number] = gps ? [gps.lat, gps.lon] : defaultCenter;

  // Risk zone color
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'HIGH': return '#ef4444';
      case 'MEDIUM': return '#f59e0b';
      default: return '#22c55e';
    }
  };

  // Risk zone radius based on score
  const getRiskRadius = (score: number) => {
    return Math.max(1000, score * 50);
  };

  return (
    <div className={cn(
      "absolute inset-0 transition-all duration-500",
      isBlurred && "blur-sm scale-105 brightness-50",
      className
    )}>
      <MapContainer
        center={center}
        zoom={gps ? 13 : 11}
        className="w-full h-full z-0"
        zoomControl={false}
        attributionControl={false}
        whenReady={() => setMapReady(true)}
      >
        <MapController gps={gps} />
        
        {/* Dark map tiles */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap'
        />

        {/* Risk heatmap zone around user */}
        {gps && riskAssessment.visual_state.map === 'heatmap_active' && (
          <>
            {/* Outer glow */}
            <Circle
              center={[gps.lat, gps.lon]}
              radius={getRiskRadius(riskAssessment.risk_score) * 1.5}
              pathOptions={{
                color: getRiskColor(riskAssessment.risk_level),
                fillColor: getRiskColor(riskAssessment.risk_level),
                fillOpacity: 0.1,
                weight: 0
              }}
            />
            {/* Inner zone */}
            <Circle
              center={[gps.lat, gps.lon]}
              radius={getRiskRadius(riskAssessment.risk_score)}
              pathOptions={{
                color: getRiskColor(riskAssessment.risk_level),
                fillColor: getRiskColor(riskAssessment.risk_level),
                fillOpacity: 0.25,
                weight: 2,
                dashArray: '10, 5'
              }}
            />
          </>
        )}

        {/* User location marker */}
        {gps && (
          <Marker 
            position={[gps.lat, gps.lon]} 
            icon={userLocationIcon}
          />
        )}
      </MapContainer>

      {/* Weather overlay widgets */}
      {!isBlurred && environment.temperature !== null && (
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          {/* Temperature */}
          <div className="px-4 py-2 bg-card/80 backdrop-blur-md rounded-xl border border-border/50 shadow-lg">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Nhiệt độ</div>
            <div className="text-2xl font-bold text-foreground">{environment.temperature?.toFixed(0)}°C</div>
          </div>

          {/* Air Quality */}
          {environment.aqi !== null && (
            <div className={cn(
              "px-4 py-2 rounded-xl border shadow-lg backdrop-blur-md",
              environment.aqi > 150 ? "bg-danger/20 border-danger/50" :
              environment.aqi > 100 ? "bg-warning/20 border-warning/50" :
              "bg-card/80 border-border/50"
            )}>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Chất lượng KK</div>
              <div className="text-2xl font-bold">AQI {environment.aqi}</div>
            </div>
          )}

          {/* Pressure */}
          {environment.pressure !== null && (
            <div className="px-4 py-2 bg-card/80 backdrop-blur-md rounded-xl border border-border/50 shadow-lg">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Áp suất</div>
              <div className="text-xl font-bold text-foreground">{environment.pressure?.toFixed(0)} hPa</div>
            </div>
          )}
        </div>
      )}

      {/* Data source label */}
      <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-card/60 backdrop-blur-sm rounded-lg border border-border/30 z-10">
        <span className="text-[10px] text-muted-foreground">
          Live • Tomorrow.io • IQAir
        </span>
      </div>

      {/* Custom styles for user marker */}
      <style>{`
        .user-location-marker {
          background: transparent;
          border: none;
        }
      `}</style>
    </div>
  );
};

export default FullScreenMap;
