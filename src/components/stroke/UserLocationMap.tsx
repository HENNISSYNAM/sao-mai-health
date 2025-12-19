import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { GPSPoint } from '@/hooks/useStrokeRiskEngine';

interface UserLocationMapProps {
  gps: { lat: number; lon: number } | null;
  gpsHistory: GPSPoint[];
  gpsAccuracy?: number | null;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

const UserLocationMap: React.FC<UserLocationMapProps> = ({
  gps,
  gpsHistory,
  gpsAccuracy,
  riskLevel
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const userMarker = useRef<maplibregl.Marker | null>(null);
  const accuracyCircle = useRef<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const initialLat = gps?.lat || 10.7769;
    const initialLon = gps?.lon || 106.7009;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'carto-dark': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'
            ],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          }
        },
        layers: [{
          id: 'carto-dark-layer',
          type: 'raster',
          source: 'carto-dark',
          minzoom: 0,
          maxzoom: 19
        }]
      },
      center: [initialLon, initialLat],
      zoom: 15,
      pitch: 0,
      bearing: 0
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    map.current.addControl(new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false
    }), 'bottom-right');

    map.current.on('load', () => {
      setIsMapReady(true);
      
      // Add GPS history source
      map.current?.addSource('gps-history', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      // GPS history trail layer
      map.current?.addLayer({
        id: 'gps-history-line',
        type: 'line',
        source: 'gps-history',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 2,
          'line-opacity': 0.6
        }
      });

      // GPS history points layer
      map.current?.addLayer({
        id: 'gps-history-points',
        type: 'circle',
        source: 'gps-history',
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'index'], 0, 3, 100, 6],
          'circle-color': '#60a5fa',
          'circle-opacity': ['interpolate', ['linear'], ['get', 'index'], 0, 0.3, 100, 0.8],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1,
          'circle-stroke-opacity': 0.5
        }
      });

      // Accuracy circle source
      map.current?.addSource('accuracy-circle', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.current?.addLayer({
        id: 'accuracy-circle-fill',
        type: 'fill',
        source: 'accuracy-circle',
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.1
        }
      });

      map.current?.addLayer({
        id: 'accuracy-circle-line',
        type: 'line',
        source: 'accuracy-circle',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 1,
          'line-opacity': 0.4
        }
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update user marker position
  useEffect(() => {
    if (!map.current || !gps || !isMapReady) return;

    // Create or update user marker
    if (!userMarker.current) {
      const el = document.createElement('div');
      el.className = 'user-location-marker';
      el.innerHTML = `
        <div class="marker-pulse"></div>
        <div class="marker-dot"></div>
      `;
      
      userMarker.current = new maplibregl.Marker({ element: el })
        .setLngLat([gps.lon, gps.lat])
        .addTo(map.current);
    } else {
      userMarker.current.setLngLat([gps.lon, gps.lat]);
    }

    // Fly to user location
    map.current.flyTo({
      center: [gps.lon, gps.lat],
      zoom: 16,
      duration: 1000
    });
  }, [gps, isMapReady]);

  // Update GPS history trail
  useEffect(() => {
    if (!map.current || !isMapReady || gpsHistory.length === 0) return;

    const source = map.current.getSource('gps-history') as maplibregl.GeoJSONSource;
    if (!source) return;

    // Create line from history
    const coordinates = gpsHistory.map(p => [p.lon, p.lat]);
    
    // Create points with index for styling
    const points = gpsHistory.map((p, index) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.lon, p.lat] },
      properties: { index, accuracy: p.accuracy }
    }));

    const lineFeature = coordinates.length > 1 ? [{
      type: 'Feature' as const,
      geometry: { type: 'LineString' as const, coordinates },
      properties: {}
    }] : [];

    source.setData({
      type: 'FeatureCollection',
      features: [...lineFeature, ...points]
    });
  }, [gpsHistory, isMapReady]);

  // Update accuracy circle
  useEffect(() => {
    if (!map.current || !gps || !gpsAccuracy || !isMapReady) return;

    const source = map.current.getSource('accuracy-circle') as maplibregl.GeoJSONSource;
    if (!source) return;

    // Create circle polygon
    const center = [gps.lon, gps.lat];
    const radiusInKm = gpsAccuracy / 1000;
    const points = 64;
    const coords = [];

    for (let i = 0; i < points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      const dx = radiusInKm * Math.cos(angle) / (111.32 * Math.cos(gps.lat * Math.PI / 180));
      const dy = radiusInKm * Math.sin(angle) / 110.574;
      coords.push([center[0] + dx, center[1] + dy]);
    }
    coords.push(coords[0]); // Close the circle

    source.setData({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [coords] },
        properties: {}
      }]
    });
  }, [gps, gpsAccuracy, isMapReady]);

  return (
    <div className="absolute inset-0">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Custom marker styles */}
      <style>{`
        .user-location-marker {
          position: relative;
          width: 24px;
          height: 24px;
        }
        .marker-dot {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 14px;
          height: 14px;
          background: ${riskLevel === 'HIGH' ? '#ef4444' : riskLevel === 'MEDIUM' ? '#f59e0b' : '#22c55e'};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          z-index: 2;
        }
        .marker-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 40px;
          background: ${riskLevel === 'HIGH' ? 'rgba(239,68,68,0.3)' : riskLevel === 'MEDIUM' ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)'};
          border-radius: 50%;
          animation: pulse 2s ease-out infinite;
          z-index: 1;
        }
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default UserLocationMap;
